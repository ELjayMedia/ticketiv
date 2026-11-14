import { describe, expect, it } from "vitest"

import { APP_PACKAGE_VERSION, resolveAppVersion } from "@/lib/app-version"

describe("resolveAppVersion", () => {
  it("never returns the old placeholder", () => {
    expect(resolveAppVersion({})).not.toBe("current")
  })

  it("prefers an explicit NEXT_PUBLIC_APP_VERSION", () => {
    expect(
      resolveAppVersion({
        NEXT_PUBLIC_APP_VERSION: "2026.08.1",
        DEPLOYMENT_ENV: "production",
        SOURCE_COMMIT: "a1b2c3d4e5f6",
      }),
    ).toBe("2026.08.1")
  })

  it("ignores a blank override", () => {
    expect(resolveAppVersion({ NEXT_PUBLIC_APP_VERSION: "   " })).toBe(`v${APP_PACKAGE_VERSION} · dev`)
  })

  it("shows package version and short sha in production", () => {
    expect(
      resolveAppVersion({ DEPLOYMENT_ENV: "production", SOURCE_COMMIT: "a1b2c3d4e5f6a7b8" }),
    ).toBe(`v${APP_PACKAGE_VERSION} · a1b2c3d`)
  })

  it("marks preview deployments so a tester can tell them apart", () => {
    expect(resolveAppVersion({ DEPLOYMENT_ENV: "preview", SOURCE_COMMIT: "0f1e2d3c4b5a" })).toBe(
      `v${APP_PACKAGE_VERSION}-preview · 0f1e2d3`,
    )
  })

  it("labels other managed environments by their DEPLOYMENT_ENV", () => {
    expect(resolveAppVersion({ DEPLOYMENT_ENV: "development", SOURCE_COMMIT: "abcdef1234567" })).toBe(
      `v${APP_PACKAGE_VERSION}-development · abcdef1`,
    )
  })

  it("falls back to a dev label when there is no commit sha", () => {
    expect(resolveAppVersion({})).toBe(`v${APP_PACKAGE_VERSION} · dev`)
    expect(resolveAppVersion({ SOURCE_COMMIT: "  " })).toBe(`v${APP_PACKAGE_VERSION} · dev`)
  })
})
