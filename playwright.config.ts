import { defineConfig } from "@playwright/test";

/**
 * Browser tests for the live office. They need the real backend (.env.local)
 * with guest mode on, and they start the dev server themselves if it isn't
 * already running.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
