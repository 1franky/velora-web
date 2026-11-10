import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("la página inicial está en es-MX", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(page).toHaveTitle("Velora");
  await expect(page.getByRole("heading", { level: 1, name: "Velora" })).toBeVisible();
});

test("la página inicial no tiene violaciones de accesibilidad WCAG A/AA", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

  expect(results.violations).toEqual([]);
});
