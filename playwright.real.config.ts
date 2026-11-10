import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra la API real (scripts/e2e-real.sh levanta la API y la base). Puerto propio para no chocar con las E2E
 * de la API falsa ni con `pnpm dev`.
 */
const PORT = 3200;

export default defineConfig({
  testDir: "./e2e-real",
  // Una sola base compartida: en serie y en el orden en que se escriben los archivos.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["github"], ["html", { open: "never", outputFolder: "playwright-report-real" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: false,
    timeout: 240_000,
    // Mapa base mínimo versionado: el mapa se dibuja sin descargar el recorte completo.
    env: {
      VELORA_API_URL: process.env.VELORA_API_URL ?? "http://localhost:8091",
      VELORA_BASEMAP_DIR: "e2e/fixtures/basemap",
    },
  },
});
