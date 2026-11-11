import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const OUTDOOR = "/actividades/a0000000-0000-4000-8000-000000000001";
const INDOOR = "/actividades/a0000000-0000-4000-8000-000000000004";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
});

test("lista las subidas y la distancia por pendiente con sus valores escritos", async ({ page }) => {
  await page.goto(OUTDOOR);
  const section = page.getByRole("region", { name: "Subidas" });
  const row = section
    .getByRole("table", { name: /Subidas de la rodada/ })
    .getByRole("row")
    .nth(1);
  await expect(row).toContainText("Del 3.2 km al 5.6 km");
  await expect(row).toContainText("144 m");
  await expect(row).toContainText("6 %");
  await expect(row).toContainText("9.4 %");
  await expect(section.getByRole("listitem").filter({ hasText: "Llano (menos de 1 %)" })).toContainText("9.0 km, 45%");
  await expect(section).toContainText("Una subida cuenta si gana al menos 25 m");
});

test("una rodada sin altitud no muestra subidas", async ({ page }) => {
  await page.goto(INDOOR);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Subidas" })).toHaveCount(0);
});

test("las subidas no tienen violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.goto(OUTDOOR);
  await expect(page.getByRole("region", { name: "Subidas" })).toBeVisible();
  // Next envía el <title> después del contenido: analizar antes daría un falso "sin título".
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page })
    .include("#subidas-titulo")
    .include("section:has(#subidas-titulo)")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});
