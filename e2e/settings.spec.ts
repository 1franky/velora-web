import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login?next=%2Fconfiguracion");
  await page.getByLabel("Correo electrónico").fill("propietario@example.com");
  await page.getByLabel("Contraseña").fill("contraseña-de-prueba");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Configuración" })).toBeVisible();
});

const bikes = (page: Page) => page.getByRole("list", { name: "Tus bicicletas" });

test("guarda la zona horaria y la conserva al recargar", async ({ page }) => {
  const zone = page.getByRole("combobox", { name: "Zona horaria" });
  await expect(zone).toHaveValue("America/Mexico_City");

  await zone.selectOption({ label: "Tijuana y Baja California" });
  await page.getByRole("button", { name: "Guardar zona horaria" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Zona horaria guardada." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Zona horaria" })).toHaveValue("America/Tijuana");
});

test("agrega, edita, retira y borra una bicicleta", async ({ page }) => {
  await expect(bikes(page).getByRole("listitem")).toHaveCount(1);

  await page.getByRole("button", { name: "Agregar bicicleta" }).click();
  const add = page.getByRole("dialog", { name: "Agregar bicicleta" });
  await add.getByRole("button", { name: "Agregar bicicleta" }).click();
  await expect(add.getByLabel("Nombre")).toHaveAttribute("aria-invalid", "true");
  await expect(add.getByLabel("Nombre")).toBeFocused();
  await expect(add.getByText("Este campo es obligatorio.")).toBeVisible();

  await add.getByLabel("Nombre").fill("Ruta de domingo");
  await add.getByLabel("Tipo").selectOption({ label: "Ruta" });
  await add.getByLabel("Peso (kg)").fill("8,4");
  await add.getByRole("button", { name: "Agregar bicicleta" }).click();
  await expect(add).toBeHidden();
  const bike = bikes(page).getByRole("listitem").filter({ hasText: "Ruta de domingo" });
  await expect(bike).toContainText("Ruta, 8.4 kg");

  await bike.getByRole("button", { name: "Editar" }).click();
  const edit = page.getByRole("dialog", { name: "Editar «Ruta de domingo»" });
  await edit.getByLabel("Nombre").fill("Ruta de diario");
  await edit.getByRole("button", { name: "Guardar cambios" }).click();
  const renamed = bikes(page).getByRole("listitem").filter({ hasText: "Ruta de diario" });
  await expect(renamed).toBeVisible();

  await renamed.getByRole("button", { name: "Retirar «Ruta de diario»" }).click();
  await expect(renamed).toContainText("Retirada");
  await expect(renamed.getByRole("button", { name: "Reactivar «Ruta de diario»" })).toBeVisible();

  await renamed.getByRole("button", { name: "Borrar" }).click();
  const confirm = page.getByRole("dialog", { name: "¿Borrar «Ruta de diario»?" });
  await expect(confirm).toContainText("Sus rodadas se conservan");
  await confirm.getByRole("button", { name: "Borrar bicicleta" }).click();
  await expect(bikes(page).getByRole("listitem")).toHaveCount(1);
});

test("registra un dispositivo", async ({ page }) => {
  await expect(page.getByText("Aún no registras dispositivos.")).toBeVisible();

  await page.getByRole("button", { name: "Agregar dispositivo" }).click();
  const dialog = page.getByRole("dialog", { name: "Agregar dispositivo" });
  await dialog.getByLabel("Nombre").fill("Edge del día a día");
  await dialog.getByLabel("Fabricante").fill("Garmin");
  await dialog.getByRole("button", { name: "Agregar dispositivo" }).click();

  await expect(page.getByRole("list", { name: "Tus dispositivos" })).toContainText("Edge del día a día");
  await expect(page.getByRole("list", { name: "Tus dispositivos" })).toContainText("Garmin");
});

test("no tiene violaciones de accesibilidad WCAG A/AA, también con un formulario abierto", async ({ page }) => {
  await expect(bikes(page)).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);

  await page.getByRole("button", { name: "Agregar bicicleta" }).click();
  await page
    .getByRole("dialog", { name: "Agregar bicicleta" })
    .getByRole("button", { name: "Agregar bicicleta" })
    .click();
  await expect(page.getByText("Este campo es obligatorio.")).toBeVisible();
  expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
});

test.describe("actividades", () => {
  test("corrige título, tipo y bicicleta desde el detalle", async ({ page }) => {
    await page.goto("/actividades/a0000000-0000-4000-8000-000000000002"); // «Rodada 29», carretera, sin bicicleta
    await page.getByRole("button", { name: "Editar" }).click();
    const dialog = page.getByRole("dialog", { name: "Editar actividad" });
    await expect(dialog.getByLabel("Bicicleta")).toHaveValue("");

    await dialog.getByLabel("Título").fill("Subida al Ajusco");
    await dialog.getByLabel("Tipo").selectOption({ label: "Gravel" });
    await dialog.getByLabel("Bicicleta").selectOption({ label: "Gravel de diario" });
    await dialog.getByRole("button", { name: "Guardar cambios" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Subida al Ajusco" })).toBeVisible();
    await expect(page.getByText(/Gravel, Gravel de diario$/)).toBeVisible();
  });

  test("asigna la bicicleta elegida a los archivos importados", async ({ page }) => {
    await page.goto("/actividades/importar");
    await page.getByLabel("Bicicleta de estos archivos").selectOption({ label: "Gravel de diario" });
    await page
      .getByLabel(/Elige archivos/)
      .setInputFiles([{ name: "salida.fit", mimeType: "application/octet-stream", buffer: Buffer.alloc(1024, "x") }]);

    const row = page.getByRole("listitem").filter({ hasText: "salida.fit" });
    await row.getByRole("link", { name: "Ver actividad" }).click({ timeout: 10_000 });
    await expect(page.getByText(/, Gravel de diario$/)).toBeVisible();
  });
});
