import { defineConfig, devices } from "@playwright/test"

// TICK-174 — e2e harness. CI-friendly: reads the target URL from
// PLAYWRIGHT_BASE_URL (Vercel preview / staging) and otherwise boots the app
// locally. Specs that need a seeded DB / test-mode Paystack guard themselves
// on env and skip when it is absent, so a bare `pnpm test:e2e` never produces
// false failures.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Only auto-start the dev server when pointing at localhost (skip on CI when
  // PLAYWRIGHT_BASE_URL targets a deployed preview).
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "pnpm dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
