import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
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
});

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
}

test("el riel lateral navega entre secciones y marca la activa", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(nav.getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Explorador" }).click();

  await expect(page).toHaveURL(/\/explorador$/);
  await expect(page).toHaveTitle("Explorador · Velora");
  await expect(page.getByRole("heading", { level: 1, name: "Explorador" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Explorador" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Inicio" })).not.toHaveAttribute("aria-current");
});

test("el enlace para saltar al contenido es el primer elemento enfocable", async ({ page }) => {
  await page.goto("/actividades");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Saltar al contenido" });
  await expect(skip).toBeFocused();
  await expect(skip).toHaveAttribute("href", "#contenido");
});

test("el tema elegido se aplica y se conserva al recargar", async ({ page }) => {
  await page.goto("/configuracion");
  const html = page.locator("html");
  await expect(page.getByRole("radio", { name: "Según tu dispositivo" })).toBeChecked();

  await page.getByRole("radio", { name: "Oscuro" }).check();
  await expect(html).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("radio", { name: "Oscuro" })).toBeChecked();

  await page.getByRole("radio", { name: "Según tu dispositivo" }).check();
  await expect(html).not.toHaveAttribute("data-theme");
});

for (const path of ["/", "/actividades", "/configuracion"]) {
  test(`${path} no tiene violaciones de accesibilidad WCAG A/AA en claro ni en oscuro`, async ({ page }) => {
    // Sin transiciones: axe no debe medir colores a medio cambio de tema.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoViolations(page);

    // Igual que en la app: preferencia guardada y aplicada por el script inicial antes del primer pintado.
    await page.evaluate(() => localStorage.setItem("velora-tema", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoViolations(page);
  });
}

test.describe("en móvil", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("la barra inferior muestra el resto de secciones en Más", async ({ page }) => {
    const nav = page.getByRole("navigation", { name: "Navegación principal" });
    const more = nav.getByRole("button", { name: "Más" });
    await expect(more).toHaveAttribute("aria-expanded", "false");

    await more.click();
    await expect(more).toHaveAttribute("aria-expanded", "true");
    await expectNoViolations(page);
    await nav.getByRole("link", { name: "Configuración" }).click();

    await expect(page).toHaveURL(/\/configuracion$/);
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("heading", { level: 1, name: "Configuración" })).toBeVisible();
  });

  test("cerrar sesión desde Más vuelve al login", async ({ page }) => {
    await page.getByRole("button", { name: "Más" }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
