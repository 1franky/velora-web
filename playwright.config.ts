import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const FAKE_API_PORT = 3101;

export default defineConfig({
  testDir: "./e2e",
  // La API falsa guarda estado compartido: las pruebas corren en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `node e2e/fake-api.mjs`,
      url: `http://localhost:${FAKE_API_PORT}/__stats`,
      reuseExistingServer: !process.env.CI,
    },
    {
      // Producción local: la misma salida que se despliega.
      command: `pnpm build && pnpm start --port ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Mapa base mínimo versionado (zoom 0–3): prueba /mapa/* sin descargar el recorte completo.
      env: { VELORA_API_URL: `http://localhost:${FAKE_API_PORT}`, VELORA_BASEMAP_DIR: "e2e/fixtures/basemap" },
    },
  ],
});
