import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const RIDE = "/actividades/a0000000-0000-4000-8000-000000000001";
const INDOOR = "/actividades/a0000000-0000-4000-8000-000000000004";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
});

const charts = (page: Page) => page.getByRole("region", { name: "Gráficas" });
const panel = (page: Page, name: string) => charts(page).getByRole("figure").filter({ hasText: name });

test("muestra un panel por serie con mínimo y máximo sin necesidad de cursor", async ({ page }) => {
  await page.goto(RIDE);

  await expect(charts(page).getByRole("figure")).toHaveCount(4);
  await expect(panel(page, "Velocidad")).toContainText("mín. 11.4 km/h, máx. 18.6 km/h");
  await expect(panel(page, "Frecuencia cardiaca")).toContainText("mín. 90 ppm, máx. 150 ppm");
  await expect(panel(page, "Altitud")).toBeVisible();
  // Sin potencia en el archivo: no hay panel vacío.
  await expect(panel(page, "Potencia")).toHaveCount(0);
  await expect(page.locator("figure canvas")).toHaveCount(4);
});

test("al pasar el cursor muestra el punto en todos los paneles y cambia de eje", async ({ page }) => {
  await page.goto(RIDE);
  const canvas = panel(page, "Altitud").locator("canvas");
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  await expect(charts(page).getByText(/^En el km \d+\.\d$/)).toBeVisible();
  await expect(panel(page, "Velocidad").locator("strong")).toHaveText(/^\d+\.\d km\/h$/);
  await expect(panel(page, "Cadencia").locator("strong")).toHaveText(/^\d+ rpm$/);

  await page.mouse.move(0, 0);
  await expect(charts(page).getByText(/^Pasa el cursor/)).toBeVisible();

  await charts(page).getByText("Tiempo", { exact: true }).click();
  await expect(charts(page).getByRole("radio", { name: "Tiempo" })).toBeChecked();
  await canvas.scrollIntoViewIfNeeded();
  const again = (await canvas.boundingBox())!;
  await page.mouse.move(again.x + again.width / 2, again.y + again.height / 2);
  await expect(charts(page).getByText(/^A las \d:\d{2}:\d{2} del inicio$/)).toBeVisible();
});

test("las vueltas omiten las columnas sin datos", async ({ page }) => {
  await page.goto(RIDE);
  const laps = page.getByRole("table", { name: "Vueltas registradas por el dispositivo" });

  await expect(laps.getByRole("row")).toHaveCount(4);
  await expect(laps.getByRole("columnheader", { name: "FC media" })).toBeVisible();
  await expect(laps.getByRole("columnheader", { name: "Potencia media" })).toHaveCount(0);
  await expect(laps.getByRole("row").nth(1)).toContainText("5.0 km");
});

test("en rodillo grafica contra el tiempo, con potencia y sin altitud ni vueltas", async ({ page }) => {
  await page.goto(INDOOR);

  await expect(panel(page, "Potencia")).toContainText("mín. 180 W, máx. 239 W");
  await expect(panel(page, "Altitud")).toHaveCount(0);
  await expect(charts(page).getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Vueltas registradas por el dispositivo" })).toHaveCount(0);
});

test("el detalle con gráficas no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(RIDE);
  await expect(page.locator("figure canvas")).toHaveCount(4);
  await expect(page.locator('[data-estado="listo"]')).toBeAttached({ timeout: 20_000 });

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
