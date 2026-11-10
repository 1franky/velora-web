import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { mkdir, truncate, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Archivo sintético: la API falsa decide el resultado por el nombre; el contenido no importa. */
const file = (name: string, bytes = 2_048) => ({
  name,
  mimeType: "application/octet-stream",
  buffer: Buffer.alloc(bytes, "sintético"),
});

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login?next=%2Factividades");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Actividades" })).toBeVisible();
});

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
}

const rows = (page: Page) => page.getByRole("table").getByRole("row");

test.describe("lista", () => {
  test("muestra 25 actividades y agrega las siguientes con Mostrar más", async ({ page }) => {
    await expect(rows(page)).toHaveCount(26); // encabezado + 25
    await expect(rows(page).nth(1)).toContainText("Rodada 30");
    await expect(page.getByRole("status")).toHaveText("25 actividades en pantalla");

    await page.getByRole("button", { name: "Mostrar más" }).click();

    await expect(rows(page)).toHaveCount(31);
    await expect(rows(page).last()).toContainText("Rodada 1");
    await expect(page.getByRole("button", { name: "Mostrar más" })).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText("30 actividades en pantalla");
  });

  test("las cifras faltantes se muestran como guion, nunca como cero", async ({ page }) => {
    const indoor = rows(page).filter({ hasText: "Rodillo" }).first();
    await expect(indoor.getByRole("cell").nth(2)).toHaveText("—");
  });

  test("filtra por tipo y distancia desde la URL y quita los filtros", async ({ page }) => {
    await page.getByLabel("Tipo").selectOption({ label: "Rodillo" });
    await page.getByRole("button", { name: "Aplicar filtros" }).click();

    await expect(page).toHaveURL(/tipo=INDOOR/);
    await expect(rows(page)).toHaveCount(6); // encabezado + 5 de rodillo
    await expect(page.getByLabel("Tipo")).toHaveValue("INDOOR");

    await page.getByRole("link", { name: "Quitar filtros" }).click();
    await expect(page).toHaveURL(/\/actividades$/);
    await expect(rows(page)).toHaveCount(26);

    await page.goto("/actividades?minKm=5000");
    await expect(page.getByRole("heading", { name: "Ninguna actividad coincide con los filtros" })).toBeVisible();
  });

  test("filtra por bicicleta", async ({ page }) => {
    await page.getByLabel("Bicicleta").selectOption({ label: "Gravel de diario" });
    await page.getByRole("button", { name: "Aplicar filtros" }).click();

    await expect(page).toHaveURL(/bici=/);
    await expect(rows(page)).toHaveCount(11); // encabezado + 10 de gravel
  });

  test("sin actividades invita a importar", async ({ page, request }) => {
    await request.post(`${API}/__empty`);
    await page.reload();

    await expect(page.getByRole("heading", { name: "Aún no tienes actividades" })).toBeVisible();
    await page.getByRole("link", { name: "Importar tus primeros archivos" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Importar archivos" })).toBeVisible();
  });

  test("no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
    // Tras el login la navegación es del cliente: el título llega al terminar; axe debe ver la página asentada.
    await expect(page).toHaveTitle("Actividades · Velora");
    await expectNoViolations(page);
  });
});

test.describe("detalle", () => {
  test("abre una actividad desde la lista con sus métricas", async ({ page }) => {
    await page.getByRole("link", { name: "Rodada 30" }).click();

    await expect(page).toHaveTitle("Rodada 30 · Velora");
    await expect(page.getByRole("heading", { level: 1, name: "Rodada 30" })).toBeVisible();
    // Next conserva oculta la página anterior (la lista): se busca dentro de las métricas.
    await expect(page.getByRole("term").filter({ hasText: /^Distancia$/ })).toBeVisible();
    await expect(page.getByText("Frecuencia cardiaca media")).toBeVisible();
    await expect(page.getByText("142 ppm")).toBeVisible();
    // Sin potencia en el archivo: no se muestra en lugar de mostrar un cero.
    await expect(page.getByText("Potencia media")).toHaveCount(0);
    await expect(page.getByText(/Importada de un archivo FIT de .* el 09\/11\/2026\./)).toBeVisible();
    await expectNoViolations(page);
  });

  test("una actividad inexistente muestra la página de no encontrado en es-MX", async ({ page }) => {
    // Con streaming el 200 ya se envió cuando la API responde 404 (limitación documentada de Next): se verifica la
    // página y que no se indexe.
    await page.goto("/actividades/a0000000-0000-4000-8000-999999999999");

    await expect(page.locator('meta[name="robots"][content="noindex"]').first()).toBeAttached();
    await expect(page.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  });
});

test.describe("importación", () => {
  test.beforeEach(async ({ page }) => {
    await page.getByRole("link", { name: "Importar archivos" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Importar archivos" })).toBeVisible();
  });

  test("procesa varios archivos uno por uno y explica cada resultado", async ({ page }) => {
    await page
      .getByLabel(/Elige archivos/)
      .setInputFiles([file("salida.gpx"), file("duplicada.fit"), file("rota.tcx"), file("notas.txt")]);

    const queue = page.getByRole("list").filter({ hasText: "salida.gpx" });
    const item = (name: string) => queue.getByRole("listitem").filter({ hasText: name });
    await expect(page.getByRole("status")).toHaveText("4 de 4 archivos procesados", { timeout: 15_000 });

    await expect(item("salida.gpx")).toContainText("Importada");
    await expect(item("duplicada.fit")).toContainText("Ya la tenías");
    await expect(item("duplicada.fit").getByRole("link", { name: "Ver la que ya tenías" })).toHaveAttribute(
      "href",
      "/actividades/a0000000-0000-4000-8000-000000000001",
    );
    await expect(item("rota.tcx")).toContainText("El archivo está dañado o incompleto.");
    await expect(item("notas.txt")).toContainText("Solo se aceptan archivos .fit, .gpx o .tcx.");
    await expectNoViolations(page);

    await page.getByRole("link", { name: "Ver mis actividades" }).click();
    await expect(rows(page).nth(1)).toContainText("Importada salida.gpx");
  });

  test("muestra correcciones y posibles duplicados con enlace para comparar", async ({ page }) => {
    await page.getByLabel(/Elige archivos/).setInputFiles([file("parecida.fit")]);

    const row = page.getByRole("listitem").filter({ hasText: "parecida.fit" });
    await expect(row).toContainText("Importada", { timeout: 10_000 });
    await expect(row).toContainText("Se corrigieron 3 saltos de GPS.");
    await expect(row).toContainText("Se parece a otra actividad que ya tenías; se importó de todos modos.");
    await expect(row.getByRole("link", { name: "Comparar" })).toBeVisible();
    await expect(row.getByRole("link", { name: "Ver actividad" })).toBeVisible();
  });

  test("un archivo de más de 10 MB llega completo a la API (la subida no pasa por Proxy)", async ({ page }) => {
    const bytes = 12 * 1024 * 1024;
    await page.getByLabel(/Elige archivos/).setInputFiles([file("larga.fit", bytes)]);

    await expect(page.getByRole("listitem").filter({ hasText: "larga.fit" })).toContainText("Importada", {
      timeout: 20_000,
    });
    const stats = (await (await page.request.get(`${API}/__stats`)).json()) as { lastUploadBytes: number };
    expect(stats.lastUploadBytes).toBeGreaterThan(bytes);
  });

  test("rechaza archivos de más de 50 MB sin subirlos", async ({ page }, testInfo) => {
    // Playwright no acepta buffers de más de 50 MB: se escribe un archivo disperso en la carpeta de la prueba.
    const path = testInfo.outputPath("enorme.fit");
    await mkdir(dirname(path), { recursive: true });
    await truncate(path, 50 * 1024 * 1024 + 1).catch(async () => {
      await writeFile(path, "");
      await truncate(path, 50 * 1024 * 1024 + 1);
    });
    await page.getByLabel(/Elige archivos/).setInputFiles(path);

    await expect(page.getByRole("listitem").filter({ hasText: "enorme.fit" })).toContainText("Pesa más de 50 MB.");
    const stats = (await (await page.request.get(`${API}/__stats`)).json()) as { lastUploadBytes: number };
    expect(stats.lastUploadBytes).toBe(0);
  });

  test("la ruta de subida rechaza solicitudes de otro sitio", async ({ page }) => {
    const response = await page.request.post("/api/importaciones", {
      headers: { Origin: "https://otro.example" },
      multipart: { file: file("salida.gpx") },
    });
    expect(response.status()).toBe(403);
  });

  test("no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
    await expectNoViolations(page);
  });
});

test.describe("en móvil", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("muestra tarjetas en lugar de la tabla", async ({ page }) => {
    await expect(page.getByRole("table")).toBeHidden();
    const cards = page.getByRole("list", { name: "Tus actividades, de la más reciente a la más antigua" });
    await expect(cards.getByRole("listitem")).toHaveCount(25);
    await expectNoViolations(page);
  });

  test("los filtros se pliegan y se abren solos si hay alguno activo", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "Filtros", exact: true });
    await expect(page.getByLabel("Tipo")).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page.getByLabel("Tipo").selectOption({ label: "Montaña" });
    await page.getByRole("button", { name: "Aplicar filtros" }).click();

    await expect(page).toHaveURL(/tipo=MOUNTAIN_BIKE/);
    await expect(page.getByRole("button", { name: "Filtros (1 activo)" })).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Tipo")).toBeVisible();
  });
});
