import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
});

const headline = (page: Page) => page.getByRole("heading", { level: 2 }).first();
const periods = (page: Page) => page.getByRole("navigation", { name: "Periodo" });

test("resume el mes con la comparación contra el mes pasado", async ({ page }) => {
  await expect(headline(page)).toHaveText("Este mes: 68.8 km en 4 rodadas");
  await expect(page.getByText(/^91\s?% menos que el mes pasado$/)).toBeVisible();
  await expect(periods(page).getByRole("link", { name: "Mes" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("term").filter({ hasText: "Tiempo en movimiento" })).toBeVisible();
});

test("cambia de periodo desde la URL y explica una semana sin rodadas", async ({ page }) => {
  await periods(page).getByRole("link", { name: "Semana" }).click();

  await expect(page).toHaveURL(/\?periodo=semana$/);
  await expect(headline(page)).toHaveText("Esta semana aún no tienes rodadas");
  await expect(page.getByText(/^100\s?% menos que la semana pasada$/).first()).toBeVisible();

  await periods(page).getByRole("link", { name: "Todo" }).click();
  await expect(headline(page)).toHaveText("En total: 1,200.8 km en 30 rodadas");
  // Sin periodo anterior no hay comparación.
  await expect(page.getByText(/que el|que la/)).toHaveCount(0);
});

test("muestra la tendencia de 12 meses también como tabla", async ({ page }) => {
  const trend = page.getByRole("region", { name: "Últimos 12 meses" });
  await expect(trend.locator("canvas")).toBeVisible();

  await trend.getByText("Ver como tabla").click();
  const table = trend.getByRole("table", { name: "Distancia, rodadas y desnivel por mes" });
  await expect(table.getByRole("row")).toHaveCount(13);
  await expect(table.getByRole("row", { name: /noviembre de 2026/ })).toContainText("68.8 km");
  await expect(table.getByRole("row", { name: /octubre de 2026/ })).toContainText("727.0 km");
});

test("enlaza la rodada más reciente con un mapa de vista previa", async ({ page }) => {
  const latest = page.getByRole("region", { name: "Tu rodada más reciente" });
  await expect(latest.getByRole("heading", { name: "Rodada 30" })).toBeVisible();
  await expect(latest.locator('[data-estado="listo"]')).toBeAttached({ timeout: 20_000 });
  // Vista previa: sin controles.
  await expect(latest.getByRole("button", { name: "Acercar" })).toHaveCount(0);

  await latest.getByRole("link", { name: "Ver detalle" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rodada 30" })).toBeVisible();
});

test("sin actividades invita a importar", async ({ page, request }) => {
  await request.post(`${API}/__empty`);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Aún no tienes actividades" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Importar tus primeros archivos" })).toBeVisible();
  await expect(periods(page)).toHaveCount(0);
});

test("no tiene violaciones de accesibilidad WCAG A/AA en claro ni en oscuro", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("region", { name: "Últimos 12 meses" }).locator("canvas")).toBeVisible();
  const wcag = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
  expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);

  await page.evaluate(() => localStorage.setItem("velora-tema", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("region", { name: "Últimos 12 meses" }).locator("canvas")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(wcag).analyze()).violations).toEqual([]);
});
