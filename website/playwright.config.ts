import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  // These hit the real backend (Render free tier, can cold-start) and the
  // real Gemini API — generous timeouts so a slow-but-working backend
  // doesn't read as a false failure.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
