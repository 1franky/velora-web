import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login?next=%2Frendimiento");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rendimiento" })).toBeVisible();
});

const lastQuery = async (page: Page) => {
  const stats = (await (await page.request.get(`${API}/__stats`)).json()) as { timeseriesQueries: string[] };
  return stats.timeseriesQueries.at(-1) ?? "";
};

const total = (page: Page, term: string) =>
  page
    .getByRole("region", { name: /Últimas|Último|Este año/ })
    .getByRole("term")
    .filter({ hasText: term })
    .locator("..");

test("muestra las últimas 12 semanas, solo de exterior, con gráficas y tabla", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 2, name: "Últimas 12 semanas" })).toBeVisible();
  expect(await lastQuery(page)).toContain("granularity=week");
  expect(await lastQuery(page)).toContain("includeIndoor=false");
  await expect(page.getByText("Solo rodadas de exterior.")).toBeVisible();
  await expect(page.getByRole("figure", { name: "Distancia (km)" })).toBeVisible();
  await expect(page.getByRole("figure", { name: "Desnivel positivo (m)" })).toBeVisible();

  await page.getByText("Ver los datos en una tabla").click();
  const table = page.getByRole("table", { name: /Totales por periodo/ });
  await expect(table.getByRole("row")).toHaveCount(13);
  await expect(table.getByRole("row").nth(1)).toContainText("2 nov – 8 de noviembre de 2026");
});

test("agrupa por mes, filtra por tipo e incluye el rodillo", async ({ page }) => {
  const rodadas = total(page, "Rodadas");
  const before = Number(await rodadas.locator("dd").textContent());

  await page.getByLabel("Agrupar por").selectOption({ label: "Mes" });
  await page.getByLabel("Incluir rodillo").check();
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/por=mes.*rodillo=1/);
  await expect(page.getByRole("heading", { level: 2, name: "Últimos 12 meses" })).toBeVisible();
  await expect(page.getByText("Incluye el rodillo (distancia virtual).")).toBeVisible();
  expect(await lastQuery(page)).toContain("includeIndoor=true");
  expect(Number(await total(page, "Rodadas").locator("dd").textContent())).toBeGreaterThan(before);

  await page.getByLabel("Tipo").selectOption({ label: "Gravel" });
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/tipo=GRAVEL/);
  expect(await lastQuery(page)).toContain("subType=GRAVEL");
});

test("avisa cuando hay duplicados contados una sola vez", async ({ page, request }) => {
  await request.post(`${API}/__duplicados-omitidos`);
  await page.reload();
  await expect(page.getByRole("status")).toContainText("2 rodadas parecen duplicadas y se contaron una sola vez.");
  await expect(page.getByRole("link", { name: "Resolver en Actividades" })).toHaveAttribute("href", "/actividades");
});

test("muestra el Eddington y los récords con su rodada y sus reglas", async ({ page }) => {
  const eddington = page.getByRole("region", { name: "Número de Eddington" });
  await expect(eddington.getByRole("term").filter({ hasText: "De siempre" }).locator("..")).toContainText(/\d+/);
  await expect(eddington).toContainText(/Te faltan? \d+ días? de \d+ km o más para llegar a \d+\./);

  const records = page.getByRole("region", { name: "Récords" });
  const longest = records.getByRole("listitem").filter({ hasText: "Rodada más larga" });
  await expect(longest).toContainText("km");
  await expect(longest).toContainText("Dato del dispositivo");
  await longest.getByRole("link").click();
  await expect(page).toHaveURL(/\/actividades\/a0000000-/);
});

test("los récords siguen el tipo y el rodillo, no el periodo", async ({ page }) => {
  await page.getByLabel("Agrupar por").selectOption({ label: "Año" });
  await page.getByLabel("Tipo").selectOption({ label: "Montaña" });
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/tipo=MOUNTAIN_BIKE/);
  await expect(page.getByRole("region", { name: "Récords" })).toBeVisible();
  const stats = (await (await page.request.get(`${API}/__stats`)).json()) as { recordsQueries: string[] };
  expect(stats.recordsQueries.at(-1)).toBe("includeIndoor=false&subType=MOUNTAIN_BIKE");
});

test("sin FC máxima invita a indicarla y, con ella, muestra el tiempo en cada zona", async ({ page }) => {
  const zones = page.getByRole("region", { name: "Zonas de frecuencia cardiaca" });
  await expect(zones).toContainText("Para ver tu tiempo en cada zona necesitamos tu FC máxima.");
  await zones.getByRole("link", { name: "Indícala en Configuración" }).click();
  await expect(page).toHaveURL(/\/configuracion#frecuencia-cardiaca$/);

  const field = page.getByLabel("FC máxima (ppm)");
  await field.fill("250");
  await page.getByRole("button", { name: "Guardar FC máxima" }).click();
  await expect(page.getByText("Escribe un número entero entre 100 y 230, o déjalo vacío.")).toBeVisible();
  await field.fill("190");
  await page.getByRole("button", { name: "Guardar FC máxima" }).click();
  await expect(page.getByRole("status").filter({ hasText: "FC máxima guardada." })).toBeVisible();

  await page.goto("/rendimiento");
  const zone2 = zones.getByRole("listitem").filter({ hasText: "Zona 2" });
  await expect(zone2).toContainText("114–132 ppm");
  await expect(zone2).toContainText("6:00:00, 42%");
  await expect(zones.getByRole("listitem").filter({ hasText: "Zona 5" })).toContainText("171 ppm o más");
  await expect(zones).toContainText("2 rodadas del periodo no tienen FC.");
  await expect(zones).toContainText("no una evaluación médica");
});

test("la carga se presenta como estimación y necesita la FC máxima", async ({ page }) => {
  const load = page.getByRole("region", { name: "Carga de entrenamiento (estimada)" });
  await expect(load).toContainText("necesitamos tu FC máxima");
  await expect(load).toContainText("Es una estimación");
  await expect(load.getByRole("figure")).toHaveCount(0);

  await page.goto("/configuracion");
  await page.getByLabel("FC máxima (ppm)").fill("190");
  await page.getByRole("button", { name: "Guardar FC máxima" }).click();
  await expect(page.getByRole("status").filter({ hasText: "FC máxima guardada." })).toBeVisible();
  await page.goto("/rendimiento");
  await expect(load.getByRole("figure", { name: "Puntos de carga por semana, últimas 12 semanas" })).toBeVisible();
  await expect(load).toContainText("no para evaluar tu salud");
});

test("Rendimiento no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("figure", { name: "Distancia (km)" })).toBeVisible();
  // Las zonas cargan en su propio Suspense: analizar antes vería el esqueleto a medio reemplazar.
  await expect(page.getByRole("region", { name: "Zonas de frecuencia cardiaca" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Récords" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Carga de entrenamiento (estimada)" })).toBeVisible();
  // Next envía el <title> después del contenido: analizar antes daría un falso "sin título".
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
