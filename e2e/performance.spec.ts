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

test("Rendimiento no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("figure", { name: "Distancia (km)" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
