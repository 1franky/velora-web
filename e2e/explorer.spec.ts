import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const BIKE = "b1a1c0de-0000-4000-8000-000000000001";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login?next=%2Fexplorador");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Explorador" })).toBeVisible();
});

const mapReady = (page: Page) => expect(page.locator('[data-estado="listo"]')).toBeAttached({ timeout: 20_000 });

const heatmapQueries = async (page: Page) =>
  ((await (await page.request.get(`${API}/__stats`)).json()) as { heatmapQueries: string[] }).heatmapQueries;

test("dibuja el mapa de calor con teselas que pasan por Velora", async ({ page }) => {
  const hosts = new Set<string>();
  page.on("request", (request) => hosts.add(new URL(request.url()).host));
  const tile = page.waitForResponse((response) => response.url().includes("/api/mapa-de-calor/"));
  await page.reload();
  await mapReady(page);

  const response = await tile;
  // La API falsa no genera teselas: vacías (204), privadas y sin caché compartida.
  expect(response.status()).toBe(204);
  expect(response.headers()["cache-control"]).toContain("private");
  expect([...hosts]).toEqual(["localhost:3100"]);
  await expect(page.getByRole("region", { name: "Mapa de calor de tus rodadas" })).toBeVisible();
  await expect(page.getByText("Los inicios y finales de tus rodadas se ven completos.")).toBeVisible();
});

test("los filtros llegan a las teselas y se conservan en la URL", async ({ page }) => {
  await mapReady(page);
  await page.getByLabel("Tipo").selectOption({ label: "Gravel" });
  await page.getByLabel("Bicicleta").selectOption({ label: "Gravel de diario" });
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(new RegExp(`/explorador\\?.*tipo=GRAVEL.*bici=${BIKE}`));
  // Sin distancias: no aplican al mapa de calor.
  await expect(page.getByLabel(/Distancia mínima/)).toHaveCount(0);

  await expect
    .poll(async () => (await heatmapQueries(page)).some((q) => q.includes("subType=GRAVEL") && q.includes(BIKE)))
    .toBe(true);
  await expect(page.getByRole("link", { name: "Quitar filtros" })).toHaveAttribute("href", "/explorador");
});

test("rechaza teselas fuera de la rejilla", async ({ page }) => {
  expect((await page.request.get("/api/mapa-de-calor/17/0/0")).status()).toBe(400);
  expect((await page.request.get("/api/mapa-de-calor/2/4/0")).status()).toBe(400);
});

test("avisa cuando la privacidad oculta inicios y finales", async ({ page }) => {
  await page.goto("/configuracion");
  await page.getByRole("combobox", { name: "Ocultar al inicio y al final" }).selectOption({ label: "300 m" });
  await page.getByRole("button", { name: "Guardar privacidad" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Privacidad guardada." })).toBeVisible();

  await page.goto("/explorador");
  await expect(page.getByText("Los inicios y finales de cada rodada están ocultos por tu privacidad.")).toBeVisible();
});

test("resume el territorio explorado y el mayor cuadrado", async ({ page }) => {
  const stats = page.getByRole("region", { name: "Territorio explorado" });
  await expect(stats.getByRole("term").filter({ hasText: "Cuadros de 1 km" }).locator("..")).toContainText("87");
  await expect(stats.getByRole("term").filter({ hasText: "Mayor cuadrado" }).locator("..")).toContainText("3 × 3 km");
  await expect(stats.getByRole("term").filter({ hasText: "Hexágonos" }).locator("..")).toContainText("1,234");
  await expect(stats).toContainText("Incluye todas tus rodadas.");
});

test("avisa mientras se calculan las celdas", async ({ page, request }) => {
  await request.post(`${API}/__exploracion-pendiente`);
  await page.reload();
  await expect(page.getByText("Calculando las celdas de 3 rodadas…")).toBeVisible();
});

test("muestra los cuadros de 1 km y lleva al mayor cuadrado", async ({ page }) => {
  await mapReady(page);
  const cells = page.waitForResponse((response) => response.url().includes("/api/exploracion/celdas"));
  await page.getByRole("button", { name: "Ver mi mayor cuadrado" }).click();
  await expect(page.getByRole("radio", { name: "Cuadros de 1 km" })).toBeChecked();
  const response = await cells;
  expect(response.status()).toBe(200);
  expect(response.url()).toContain("grid=MX1KM");
  await expect(page.getByRole("status").filter({ hasText: "Las celdas incluyen todas tus rodadas" })).toBeVisible();

  await page.getByRole("radio", { name: "Hexágonos" }).check();
  // Los hexágonos piden más zoom; el mayor cuadrado deja el mapa cerca, así que se piden.
  await expect
    .poll(
      async () => ((await (await page.request.get(`${API}/__stats`)).json()) as { cellQueries: string[] }).cellQueries,
    )
    .toContainEqual(expect.stringContaining("grid=H3"));
});

test("pide acercarse para ver celdas desde muy lejos", async ({ page }) => {
  await mapReady(page);
  await page.getByRole("radio", { name: "Hexágonos" }).check();
  // Cada clic aleja desde el zoom a medio animar: varios clics rápidos alejan menos de lo que parece. Se aleja hasta
  // que el aviso aparece (los hexágonos piden zoom 10 o más; la vista inicial está en 12 como máximo).
  const notice = page.getByRole("status").filter({ hasText: "Acércate para ver las celdas." });
  await expect(async () => {
    await page.getByRole("button", { name: "Alejar" }).click();
    await expect(notice).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
});

test("el Explorador no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mapReady(page);
  // Next envía el <title> después del contenido: analizar antes daría un falso "sin título".
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
