import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT } from "../playwright.config";

const API = `http://localhost:${FAKE_API_PORT}`;
const EMAIL = "propietario@example.com";
const PASSWORD = "contraseña-de-prueba";

test.beforeEach(async ({ request }) => {
  await request.post(`${API}/__reset`);
});

async function login(page: Page, password = PASSWORD) {
  await page.getByLabel("Correo electrónico").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function stats(page: Page) {
  return (await page.request.get(`${API}/__stats`)).json() as Promise<{ refreshCalls: number; logins: number }>;
}

test("inicia sesión, vuelve a la ruta pedida y muestra el usuario", async ({ page }) => {
  await page.goto("/?origen=prueba");
  await expect(page).toHaveURL(/\/login\?next=%2F%3Forigen%3Dprueba$/);

  await login(page);

  await expect(page).toHaveURL(/\/\?origen=prueba$/);
  await expect(page.getByText(`Hola, ${EMAIL}`)).toBeVisible();
});

test("los tokens viven en cookies HttpOnly que JavaScript no puede leer", async ({ page, context }) => {
  await page.goto("/login");
  await login(page);
  await expect(page.getByText(`Hola, ${EMAIL}`)).toBeVisible();

  const cookies = await context.cookies();
  const session = cookies.filter((c) => c.name.includes("velora-"));
  expect(session).toHaveLength(2);
  expect(session.every((c) => c.httpOnly && c.sameSite === "Lax")).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain("velora-");
});

test("muestra errores en es-MX sin perder el correo escrito", async ({ page }) => {
  await page.goto("/login");

  await login(page, "incorrecta");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Correo o contraseña incorrectos.");
  await expect(page.getByLabel("Correo electrónico")).toHaveValue(EMAIL);

  await login(page, "bloqueado");
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Demasiados intentos. Espera 2 minutos antes de volver a intentarlo.",
  );
});

test("al caducar el access token, Proxy lo renueva una sola vez aunque haya solicitudes simultáneas", async ({
  page,
  context,
}) => {
  await page.goto("/login");
  await login(page);
  await expect(page.getByText(`Hola, ${EMAIL}`)).toBeVisible();

  await page.waitForTimeout(2_500); // la cookie del access token dura 2 s en la API falsa
  const pages = await Promise.all([context.newPage(), context.newPage(), context.newPage()]);
  await Promise.all(pages.map((p) => p.goto("/")));

  for (const p of pages) {
    await expect(p.getByText(`Hola, ${EMAIL}`)).toBeVisible();
  }
  expect((await stats(page)).refreshCalls).toBe(1);
});

test("cerrar sesión revoca la sesión y vuelve al login", async ({ page, context }) => {
  await page.goto("/login");
  await login(page);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();

  await expect(page).toHaveURL(/\/login$/);
  expect((await context.cookies()).filter((c) => c.name.includes("velora-"))).toHaveLength(0);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("no redirige fuera del sitio tras el login", async ({ page }) => {
  await page.goto("/login?next=//otro.example/robar");

  await login(page);

  await expect(page).toHaveURL(/^http:\/\/localhost:3100\/$/);
});

test("con sesión, /login redirige al inicio", async ({ page }) => {
  await page.goto("/login");
  await login(page);
  await expect(page.getByText(`Hola, ${EMAIL}`)).toBeVisible();

  await page.goto("/login");

  await expect(page).toHaveURL(/\/$/);
});
