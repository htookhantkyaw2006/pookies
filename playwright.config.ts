import { defineConfig } from "@playwright/test";

/**
 * Browser tests for the live office. They need the real backend (.env.local)
 * with guest mode on, and they start the dev server themselves if it isn't
 * already running.
 *
 * To test a live server that's already running elsewhere (say, while the dev
 * server shows the sample office), point E2E_BASE_URL at it.
 */
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: external ?? "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
  },
  webServer: external
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
