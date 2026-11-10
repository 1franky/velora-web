import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const LATEST = "/actividades/a0000000-0000-4000-8000-000000000001"; // «Rodada 30»
const SECOND = "/actividades/a0000000-0000-4000-8000-000000000002"; // «Rodada 29»
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

test.describe("borrar", () => {
  test("pide confirmación con foco en Cancelar y vuelve a la lista con un aviso", async ({ page }) => {
    await page.goto(SECOND);
    await page.getByRole("button", { name: "Borrar actividad" }).click();

    const dialog = page.getByRole("dialog", { name: "¿Borrar «Rodada 29»?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
    await expect(dialog).toContainText("No se puede deshacer.");
    await expectNoViolations(page);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.getByRole("button", { name: "Borrar actividad" }).click();
    await dialog.getByRole("button", { name: "Borrar actividad" }).click();

    await expect(page).toHaveURL(/\/actividades\?aviso=borrada$/);
    await expect(page.getByRole("status").filter({ hasText: "Actividad borrada." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Rodada 29", exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Rodada 30", exact: true })).toBeVisible();
  });
});

test.describe("recalcular", () => {
  test("sigue el trabajo y muestra las métricas nuevas sin recargar", async ({ page }) => {
    await page.goto(LATEST);
    const elevation = page
      .getByRole("term")
      .filter({ hasText: /^Desnivel positivo$/ })
      .locator("..");
    await expect(elevation).toContainText("120 m");

    await page.getByRole("button", { name: "Recalcular métricas" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Listo: las métricas se recalcularon." })).toBeVisible({
      timeout: 10_000,
    });
    await expect(elevation).toContainText("999 m");
  });
});

test.describe("duplicados", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${API}/__duplicados`);
  });

  test("avisa en el detalle, compara y conserva la más completa", async ({ page }) => {
    await page.goto(LATEST);
    const notice = page.getByRole("complementary", { name: /otras 2 actividades/ });
    await expect(notice).toBeVisible();

    await notice.getByRole("link", { name: "Comparar con «Rodada 30 (GPX)»" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Comparar actividades" })).toBeVisible();
    const table = page.getByRole("table", { name: "Comparación de las dos actividades, dato por dato" });
    await expect(table.getByRole("row", { name: /Archivo original/ })).toContainText("FIT");
    await expect(table.getByRole("row", { name: /Archivo original/ })).toContainText("GPX");
    await expect(table.getByRole("columnheader", { name: /Trae más datos/ })).toContainText("Rodada 30");
    await expect(table.getByRole("row", { name: /Datos registrados/ })).toContainText("Frecuencia cardiaca");
    await expectNoViolations(page);

    await page.getByRole("button", { name: "Quedarme con «Rodada 30» (FIT)" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Quedarte con «Rodada 30» y borrar «Rodada 30 (GPX)»?" });
    await expect(dialog).toContainText("Se borra «Rodada 30 (GPX)» (GPX)");
    await expectNoViolations(page);
    await dialog.getByRole("button", { name: "Borrar «Rodada 30 (GPX)»" }).click();

    await expect(page).toHaveURL(/\/actividades\/a0000000-0000-4000-8000-000000000001\?aviso=duplicado-resuelto$/);
    await expect(
      page.getByRole("status").filter({ hasText: "Listo: conservaste esta actividad y borraste la otra." }),
    ).toBeVisible();
    // Queda la copia TCX por resolver.
    await expect(page.getByRole("complementary", { name: /en otra actividad/ })).toContainText("Rodada 30 (TCX)");
  });

  test("sin duplicados no muestra aviso", async ({ page }) => {
    await page.goto(SECOND);
    await expect(page.getByRole("heading", { level: 1, name: "Rodada 29" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: /Parece que esta rodada/ })).toHaveCount(0);
  });

  test("una comparación inválida muestra la página de no encontrado", async ({ page }) => {
    await page.goto("/actividades/comparar?a=a0000000-0000-4000-8000-000000000001&b=no-es-uuid");
    await expect(page.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeVisible();
  });
});
