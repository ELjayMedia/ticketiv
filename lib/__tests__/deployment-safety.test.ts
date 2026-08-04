import { describe, expect, it } from "vitest"

import {
  DeploymentSafetyError,
  TICKETIV_PRODUCTION_SUPABASE_REF,
  assertDeploymentSafety,
  describeDeploymentSafety,
  extractSupabaseProjectRef,
  getDeploymentSafetyBanner,
  normalizeAppOrigin,
} from "@/lib/deployment-safety"

const previewEnv = {
  VERCEL: "1",
  VERCEL_ENV: "preview",
  VERCEL_GIT_COMMIT_REF: "agent/tick-342-shared-env-safety",
  NEXT_PUBLIC_APP_URL: "https://ticketiv.app",
  NEXT_PUBLIC_SUPABASE_URL: `https://${TICKETIV_PRODUCTION_SUPABASE_REF}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  PAYSTACK_SECRET_KEY: "sk_test_abc123",
}

describe("deployment safety", () => {
  it("extracts the Supabase project ref from the public project URL", () => {
    expect(extractSupabaseProjectRef(`https://${TICKETIV_PRODUCTION_SUPABASE_REF}.supabase.co`)).toBe(
      TICKETIV_PRODUCTION_SUPABASE_REF,
    )
    expect(extractSupabaseProjectRef("not a url")).toBeNull()
  })

  it("shows a compact warning for preview builds backed by production Supabase data", () => {
    expect(getDeploymentSafetyBanner(previewEnv)).toEqual({
      label: "Preview build",
      message: "Connected to production Supabase data",
      branchLabel: "agent/tick-342-shared-env...",
    })
  })

  it("does not show the shared-data banner on the production deployment", () => {
    expect(
      getDeploymentSafetyBanner({
        ...previewEnv,
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).toBeNull()
  })

  it("allows a coherent preview configuration that stays on test-mode payments", () => {
    expect(assertDeploymentSafety(previewEnv).issues).toEqual([])
  })

  it("normalizes host-only app URLs to a safe https origin", () => {
    expect(normalizeAppOrigin("ticketiv.app")).toBe("https://ticketiv.app")
    expect(normalizeAppOrigin("www.ticketiv.app")).toBe("https://www.ticketiv.app")
    expect(
      assertDeploymentSafety({
        ...previewEnv,
        NEXT_PUBLIC_APP_URL: "ticketiv.app",
      }).issues,
    ).toEqual([])
  })

  it("fails fast when a preview deployment contains a live Paystack secret or override", () => {
    expect(() =>
      assertDeploymentSafety({
        ...previewEnv,
        PAYSTACK_SECRET_KEY: "sk_live_abc123",
        PAYSTACK_ALLOW_LIVE_MODE: "true",
      }),
    ).toThrow(DeploymentSafetyError)
  })

  it("fails fast when Vercel production points at a non-canonical app domain", () => {
    const report = describeDeploymentSafety({
      ...previewEnv,
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://ticketiv.com",
    })

    expect(report.issues).toContain("Vercel production must use NEXT_PUBLIC_APP_URL=https://ticketiv.app.")
  })

  it("keeps local no-env builds available for tests and static development", () => {
    expect(assertDeploymentSafety({}).deploymentEnvironment).toBe("local")
  })
})
