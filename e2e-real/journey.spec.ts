import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { file, gpx, tcx, type Ride } from "./rides";

/**
 * Recorrido completo contra la API real: cada paso depende del anterior (misma base desechable), por eso en serie.
 * Credenciales de un propietario de prueba con contraseña aleatoria (scripts/e2e-real.sh).
 */
test.describe.configure({ mode: "serial" });

const EMAIL = process.env.E2E_OWNER_EMAIL ?? "";
const PASSWORD = process.env.E2E_OWNER_PASSWORD ?? "";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
// Ayer a las 8:00 de la Ciudad de México: cae en la semana y el mes en curso casi siempre.
const START = new Date(Date.now() - 24 * 3600 * 1000);
START.setUTCHours(14, 0, 0, 0);
const RIDE: Ride = { start: START, points: 1200, seconds: 1 };

let gpxActivity = "";
let tcxActivity = "";

test.beforeAll(() => {
  expect(EMAIL, "Corre estas pruebas con pnpm e2e:real").not.toBe("");
});

async function login(page: Page, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  // El login es una server action: esperar a salir de /login antes de navegar de nuevo, o se cancela.
  await page.waitForURL((url) => url.pathname !== "/login");
}

async function expectNoViolations(page: Page) {
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
}

async function importFiles(page: Page, files: ReturnType<typeof file>[]) {
  await page.goto("/actividades/importar");
  // Elegir archivos antes de la hidratación los perdería (React aún no escucha el cambio): una persona no es tan rápida.
  await page.waitForLoadState("networkidle");
  await page.getByLabel(/Elige archivos/).setInputFiles(files);
  await expect(page.getByRole("status")).toHaveText(
    `${files.length} de ${files.length} ${files.length === 1 ? "archivo procesado" : "archivos procesados"}`,
    { timeout: 45_000 },
  );
}

const row = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });

test("rechaza credenciales incorrectas y entra con las correctas", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña").fill("no-es-la-contraseña");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Correo o contraseña incorrectos.");

  await login(page);
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
  await expect(page.getByText(`Hola, ${EMAIL}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aún no tienes actividades" })).toBeVisible();
});

test("importa un GPX, reconoce el mismo archivo y rechaza uno dañado", async ({ page }) => {
  await login(page, "/actividades/importar");
  await importFiles(page, [
    file("salida.gpx", gpx(RIDE)),
    file("otra-vez.gpx", gpx(RIDE)),
    file("rota.gpx", "<gpx><trk><trkseg><trkpt lat="),
  ]);

  await expect(row(page, "salida.gpx")).toContainText("Importada");
  await expect(row(page, "otra-vez.gpx")).toContainText("Ya la tenías");
  await expect(row(page, "rota.gpx")).toContainText("Rechazada");
  gpxActivity = (await row(page, "salida.gpx").getByRole("link", { name: "Ver actividad" }).getAttribute("href")) ?? "";
  expect(gpxActivity).toMatch(/^\/actividades\/[0-9a-f-]{36}$/);
});

test("el detalle muestra métricas, mapa y gráficas calculadas por la API", async ({ page }) => {
  await login(page, gpxActivity);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page
      .getByRole("term")
      .filter({ hasText: /^Distancia$/ })
      .locator(".."),
  ).toContainText("km");
  await expect(page.locator('[data-estado="listo"]')).toBeAttached({ timeout: 30_000 });
  const charts = page.getByRole("region", { name: "Gráficas" });
  await expect(charts.getByRole("figure").filter({ hasText: "Altitud" })).toBeVisible();
  await expect(charts.getByRole("figure").filter({ hasText: "Frecuencia cardiaca" })).toContainText("ppm");
  await expectNoViolations(page);
});

test("importa la misma rodada en TCX y la marca como posible duplicado", async ({ page }) => {
  await login(page, "/actividades/importar");
  await importFiles(page, [file("salida.tcx", tcx(RIDE))]);

  await expect(row(page, "salida.tcx")).toContainText("Importada");
  await expect(row(page, "salida.tcx")).toContainText("Se parece a otra actividad que ya tenías");
  tcxActivity = (await row(page, "salida.tcx").getByRole("link", { name: "Ver actividad" }).getAttribute("href")) ?? "";
});

test("compara los duplicados y conserva uno", async ({ page }) => {
  await login(page, tcxActivity);
  const notice = page.getByRole("complementary", { name: /Parece que esta rodada ya la tienes/ });
  await expect(notice).toBeVisible();
  await notice.getByRole("link", { name: /^Comparar con/ }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Comparar actividades" })).toBeVisible();
  const table = page.getByRole("table", { name: "Comparación de las dos actividades, dato por dato" });
  await expect(table.getByRole("row", { name: /Archivo original/ })).toContainText("TCX");
  await expect(table.getByRole("row", { name: /Archivo original/ })).toContainText("GPX");
  await expectNoViolations(page);

  await page.getByRole("button", { name: /\(TCX\)$/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Borrar/ })
    .click();
  await expect(page.getByRole("status").filter({ hasText: "conservaste esta actividad" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: /Parece que esta rodada/ })).toHaveCount(0);

  await page.goto(gpxActivity);
  await expect(page.getByRole("heading", { level: 1, name: "No encontramos esta página" })).toBeVisible();
});

test("configura una bicicleta y la asigna a la rodada", async ({ page }) => {
  await login(page, "/configuracion");
  await page.getByRole("button", { name: "Agregar bicicleta" }).click();
  const add = page.getByRole("dialog", { name: "Agregar bicicleta" });
  await add.getByLabel("Nombre").fill("Gravel de pruebas");
  await add.getByRole("button", { name: "Agregar bicicleta" }).click();
  await expect(page.getByRole("list", { name: "Tus bicicletas" })).toContainText("Gravel de pruebas");

  await page.goto(tcxActivity);
  await page.getByRole("button", { name: "Editar" }).click();
  const edit = page.getByRole("dialog", { name: "Editar actividad" });
  await edit.getByLabel("Título").fill("Rodada de prueba editada");
  await edit.getByLabel("Bicicleta").selectOption({ label: "Gravel de pruebas" });
  await edit.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Rodada de prueba editada" })).toBeVisible();

  await page.goto("/actividades");
  await page.getByLabel("Bicicleta").selectOption({ label: "Gravel de pruebas" });
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("link", { name: "Rodada de prueba editada" })).toBeVisible();
});

test("la privacidad recorta el inicio y el fin en la API real", async ({ page }) => {
  await login(page, "/configuracion");
  await page.getByRole("combobox", { name: "Ocultar al inicio y al final" }).selectOption({ label: "200 m" });
  await page.getByRole("button", { name: "Guardar privacidad" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Privacidad guardada." })).toBeVisible();

  await page.goto(tcxActivity);
  await expect(page.locator('[data-estado="listo"]')).toBeAttached({ timeout: 30_000 });
  await expect(page.getByText(/El inicio y el fin de este recorrido están ocultos/)).toBeVisible();
});

test("recalcula las métricas desde el archivo original", async ({ page }) => {
  await login(page, tcxActivity);
  await page.getByRole("button", { name: "Recalcular métricas" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Listo: las métricas se recalcularon." })).toBeVisible({
    timeout: 45_000,
  });
  // El reproceso conserva lo que el usuario corrigió.
  await expect(page.getByRole("heading", { level: 1, name: "Rodada de prueba editada" })).toBeVisible();
});

test("Inicio resume la rodada con datos reales", async ({ page }) => {
  await login(page);
  await page.getByRole("navigation", { name: "Periodo" }).getByRole("link", { name: "Todo" }).click();
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(/^En total: .+ km en 1 rodada$/);
  await expect(page.getByRole("region", { name: "Tu rodada más reciente" })).toContainText("Rodada de prueba editada");
  await expectNoViolations(page);
});

test("borra la actividad y cierra sesión", async ({ page }) => {
  await login(page, tcxActivity);
  await page.getByRole("button", { name: "Borrar actividad" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Borrar actividad" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Actividad borrada." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aún no tienes actividades" })).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/actividades");
  await expect(page).toHaveURL(/\/login\?next=%2Factividades$/);
});
