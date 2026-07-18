import { defineConfig } from "vitest/config"
import { resolve } from "node:path"

// TICK-174 — unit test harness.
export default defineConfig({
  resolve: {
    alias: {
      // Path alias used across the app.
      "@": resolve(__dirname, "."),
      "@ticketiv/tokens": resolve(__dirname, "packages/tokens/src/index.ts"),
      // "server-only" throws when imported outside an RSC/server bundle; stub it
      // so server modules can be unit-tested in the node environment.
      "server-only": resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e/**"],
  },
})
