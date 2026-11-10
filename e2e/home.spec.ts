import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("sin sesión, la página inicial lleva al login en es-MX", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(page).toHaveTitle("Iniciar sesión · Velora");
  await expect(page.getByRole("heading", { level: 1, name: "Iniciar sesión" })).toBeVisible();
});

test("el login no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.goto("/login");

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

  expect(results.violations).toEqual([]);
});
