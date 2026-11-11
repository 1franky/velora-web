import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
/** La más reciente (índice 0, confianza alta), la segunda (confianza baja) y la más antigua (la primera). */
const LATEST = "/actividades/a0000000-0000-4000-8000-000000000001";
const SECOND = "/actividades/a0000000-0000-4000-8000-000000000002";
const OLDEST = "/actividades/a0000000-0000-4000-8000-000000000030";
const INDOOR = "/actividades/a0000000-0000-4000-8000-000000000004";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
});

test("dice cuánto recorriste por primera vez, con su confianza, y lo marca en el mapa", async ({ page }) => {
  await page.goto(LATEST);
  const panel = page.getByRole("region", { name: "Caminos nuevos" });
  await expect(panel).toContainText("4.2 km por primera vez (14% de la rodada)");
  await expect(panel).toContainText("Confianza alta");
  await expect(panel).toContainText("Comparado con 29 rodadas anteriores.");
  await expect(panel).toContainText("Los tramos nuevos se marcan en el mapa");
  await expect(page.locator('[data-estado="listo"]')).toBeAttached({ timeout: 20_000 });
  await expect(page.getByText("El inicio y el fin ocultos")).toHaveCount(0);
});

test("explica una confianza baja", async ({ page }) => {
  await page.goto(SECOND);
  await expect(page.getByRole("region", { name: "Caminos nuevos" })).toContainText("Confianza baja");
});

test("la primera rodada es toda nueva y no se marca en el mapa", async ({ page }) => {
  await page.goto(OLDEST);
  const panel = page.getByRole("region", { name: "Caminos nuevos" });
  await expect(panel).toContainText("Tu primera rodada registrada: todo el camino es nuevo.");
  await expect(panel).not.toContainText("Confianza");
  await expect(panel).not.toContainText("se marcan en el mapa");
});

test("una rodada sin GPS no muestra caminos nuevos", async ({ page }) => {
  await page.goto(INDOOR);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Caminos nuevos" })).toHaveCount(0);
});

test("el detalle con caminos nuevos no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LATEST);
  await expect(page.getByRole("region", { name: "Caminos nuevos" })).toBeVisible();
  await expect(page.locator('[data-estado="listo"]')).toBeAttached({ timeout: 20_000 });
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});
