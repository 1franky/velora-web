import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
  await page.goto("/configuracion");
});

test("conecta Strava, muestra el avance y es accesible", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Strava" })).toBeVisible();
  await page.getByRole("button", { name: "Conectar con Strava" }).click();

  await expect(page).toHaveURL(/\/configuracion\?strava=conectado#strava$/);
  await expect(page.locator("section:has(#strava) p[role=status]")).toContainText("Strava quedó conectado");
  await expect(page.getByText("12 rodadas", { exact: true })).toBeVisible();
  await expect(page.getByText("Importando, poco a poco")).toBeVisible();
  const results = await new AxeBuilder({ page }).include("section:has(#strava)").withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
});

test("explica por qué no se conectó", async ({ page }) => {
  await page.goto("/configuracion/strava/retorno?error=access_denied");
  await expect(page).toHaveURL(/strava=denegado#strava$/);
  await expect(page.locator("p[role=alert]")).toContainText("No autorizaste el acceso en Strava");

  await page.goto("/configuracion/strava/retorno?code=x&state=estado-1&scope=read");
  await expect(page.locator("p[role=alert]")).toContainText("autoriza el acceso a todas tus actividades");

  await page.goto("/configuracion/strava/retorno?code=x&state=otro&scope=read,activity:read_all");
  await expect(page.locator("p[role=alert]")).toContainText("expiró o no es válida");
});

test("desconecta y puede borrar lo importado", async ({ page, request }) => {
  await page.getByRole("button", { name: "Conectar con Strava" }).click();
  await expect(page.getByText("12 rodadas", { exact: true })).toBeVisible();

  await page.getByLabel("Borrar también las 12 rodadas importadas de Strava").check();
  await page.getByRole("button", { name: "Desconectar" }).click();

  await expect(page).toHaveURL(/strava=desconectado#strava$/);
  await expect(page.getByRole("button", { name: "Conectar con Strava" })).toBeVisible();
  expect((await (await request.get(`${API}/__strava`)).json()).deleteRequested).toBe(true);
});

test("pide volver a conectar si Strava revocó el acceso", async ({ page, request }) => {
  await page.getByRole("button", { name: "Conectar con Strava" }).click();
  await expect(page.getByText("12 rodadas", { exact: true })).toBeVisible();
  await request.post(`${API}/__strava-revocado`);
  await page.goto("/configuracion");
  await expect(page.locator("p[role=alert]")).toContainText("Strava ya no acepta el acceso de Velora");
  await expect(page.getByRole("button", { name: "Volver a conectar" })).toBeVisible();
});

test("con el conector apagado no aparece la sección", async ({ page, request }) => {
  await request.post(`${API}/__strava-apagado`);
  await page.goto("/configuracion");
  await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Strava" })).toHaveCount(0);
});

test("una actividad importada de Strava lo dice en su detalle", async ({ page, request }) => {
  await request.post(`${API}/__actividad-strava`);
  await page.goto("/actividades/a0000000-0000-4000-8000-000000000001");
  await expect(page.getByText(/^Importada de Strava el 09\/11\/2026\.$/)).toBeVisible();
});
