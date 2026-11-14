import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const EMAIL = "propietario@example.com";
const PASSWORD = "contraseña-de-prueba";
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.beforeEach(async ({ page, request }) => {
  await request.post(`${API}/__reset`);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Inicio" })).toBeVisible();
  await page.goto("/configuracion");
});

test("la sección Tus datos es accesible", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Tus datos" })).toBeVisible();
  await expect(page).toHaveTitle(/\S/);
  const results = await new AxeBuilder({ page }).include("section:has(#tus-datos)").withTags(WCAG).analyze();
  expect(results.violations).toEqual([]);
});

test("descarga la exportación como ZIP sin salir de Configuración", async ({ page }) => {
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar mis datos" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("velora-export-2026-11-14.zip");
  const stream = await file.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  expect(Buffer.concat(chunks).subarray(0, 2).toString()).toBe("PK");
  await expect(page).toHaveURL(/\/configuracion$/);
});

test("si ya hay una exportación en curso, vuelve con un aviso", async ({ page, request }) => {
  await request.post(`${API}/__exportacion-en-curso`);
  await page.getByRole("link", { name: "Descargar mis datos" }).click();
  await expect(page).toHaveURL(/\/configuracion\?datos=en-curso#tus-datos$/);
  await expect(page.getByText("Ya hay una descarga en curso. Espera a que termine e intenta de nuevo.")).toBeVisible();
});

test("no borra nada sin escribir BORRAR ni con la contraseña incorrecta", async ({ page, request }) => {
  const submit = page.getByRole("button", { name: "Borrar mi cuenta para siempre" });
  await page.getByLabel("Tu contraseña").fill(PASSWORD);
  await page.getByLabel("Escribe BORRAR para confirmar").fill("borrar");
  await submit.click();
  await expect(page.getByLabel("Escribe BORRAR para confirmar")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Tu contraseña").fill("otra-contraseña");
  await page.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await submit.click();
  await expect(page.getByText("La contraseña no es correcta. No se borró nada.")).toBeVisible();

  const stats = await (await request.get(`${API}/__stats`)).json();
  expect(stats.accountDeleted).toBe(false);
});

test("con demasiados intentos dice cuánto esperar", async ({ page }) => {
  await page.getByLabel("Tu contraseña").fill("bloqueado");
  await page.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: "Borrar mi cuenta para siempre" }).click();
  await expect(page.getByText("Demasiados intentos. Espera 2 minutos antes de volver a intentarlo.")).toBeVisible();
});

test("borra la cuenta, cierra la sesión y ya no se puede entrar", async ({ page, context, request }) => {
  await page.getByLabel("Tu contraseña").fill(PASSWORD);
  await page.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await page.getByRole("button", { name: "Borrar mi cuenta para siempre" }).click();

  await expect(page).toHaveURL(/\/login\?cuenta=borrada$/);
  await expect(page.getByText("Tu cuenta y todos tus datos se borraron.")).toBeVisible();
  const cookies = await context.cookies();
  expect(cookies.filter((cookie) => cookie.value !== "")).toEqual([]);
  expect((await (await request.get(`${API}/__stats`)).json()).accountDeleted).toBe(true);

  // Next conserva oculta la página anterior: "Contraseña" exacta para no tomar el campo de Configuración.
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
});
