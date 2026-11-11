import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
/** Primera actividad sintética (gravel, con recorrido) y la cuarta (rodillo, sin GPS). */
const WITH_TRACK = "/actividades/a0000000-0000-4000-8000-000000000001";
const INDOOR = "/actividades/a0000000-0000-4000-8000-000000000004";

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
});

const mapReady = (page: Page) => expect(page.locator('[data-estado="listo"]')).toBeAttached({ timeout: 20_000 });

test("dibuja el recorrido sobre el mapa base servido por Velora, sin terceros", async ({ page }) => {
  const hosts = new Set<string>();
  page.on("request", (request) => hosts.add(new URL(request.url()).host));

  await page.goto(WITH_TRACK);
  await mapReady(page);

  const map = page.getByRole("region", { name: "Mapa del recorrido" });
  await expect(map.getByRole("button", { name: "Acercar" })).toBeVisible();
  await expect(map.getByText("© OpenStreetMap")).toBeAttached();
  await expect(page.getByText("El mapa base no está instalado")).toHaveCount(0);
  await expect(page.getByRole("region", { name: /^Mapa interactivo/ })).toHaveAttribute("tabindex", "0");
  // Ni teselas, ni fuentes, ni iconos de terceros: nadie más ve qué zona se consulta (ADR-015).
  expect([...hosts]).toEqual(["localhost:3100"]);

  // Tras encuadrar el recorrido se pide con más detalle que la primera vista.
  const zooms = async () =>
    ((await (await page.request.get(`${API}/__stats`)).json()) as { trackZooms: number[] }).trackZooms;
  expect((await zooms())[0]).toBe(12);
  expect(Math.max(...(await zooms()))).toBeGreaterThan(12);
});

test("el mapa sigue el tema oscuro", async ({ page }) => {
  await page.goto(WITH_TRACK);
  await page.evaluate(() => localStorage.setItem("velora-tema", "dark"));
  const sprite = page.waitForResponse((response) => response.url().includes("/mapa/sprites/dark"));
  await page.reload();

  expect((await sprite).status()).toBe(200);
  await mapReady(page);
});

test("una actividad de rodillo no muestra mapa", async ({ page }) => {
  await page.goto(INDOOR);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Mapa del recorrido" })).toHaveCount(0);
});

test("el detalle con mapa no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(WITH_TRACK);
  await mapReady(page);

  // Next envía el <title> después del contenido: analizar antes daría un falso "sin título".
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test.describe("archivos del mapa base", () => {
  test("se sirven por rangos con ETag", async ({ page }) => {
    const first = await page.request.get("/mapa/mexico.pmtiles", { headers: { Range: "bytes=0-126" } });
    expect(first.status()).toBe(206);
    expect(first.headers()["content-range"]).toMatch(/^bytes 0-126\/\d+$/);
    expect((await first.body()).subarray(0, 7).toString()).toBe("PMTiles");

    const etag = first.headers().etag;
    const again = await page.request.get("/mapa/mexico.pmtiles", { headers: { "If-None-Match": etag } });
    expect(again.status()).toBe(304);

    const outOfRange = await page.request.get("/mapa/mexico.pmtiles", { headers: { Range: "bytes=999999999-" } });
    expect(outOfRange.status()).toBe(416);

    const glyphs = await page.request.get("/mapa/fonts/Noto%20Sans%20Regular/0-255.pbf");
    expect(glyphs.status()).toBe(200);
    expect(glyphs.headers()["content-type"]).toBe("application/x-protobuf");
  });

  test("solo existen las rutas del mapa", async ({ page }) => {
    for (const path of ["/mapa/README.md", "/mapa/fonts/..%2F..%2Fpackage.json/0-255.pbf", "/mapa/otro.pmtiles"]) {
      expect((await page.request.get(path)).status(), path).toBe(404);
    }
  });

  test("sin sesión válida responden 401", async ({ playwright }) => {
    const anonymous = await playwright.request.newContext({ baseURL: "http://localhost:3100" });
    expect((await anonymous.get("/mapa/mexico.pmtiles")).status()).toBe(401);

    const forged = await playwright.request.newContext({
      baseURL: "http://localhost:3100",
      extraHTTPHeaders: { Cookie: "velora-access=inventada" },
    });
    expect((await forged.get("/mapa/mexico.pmtiles")).status()).toBe(401);
    await Promise.all([anonymous.dispose(), forged.dispose()]);
  });
});
