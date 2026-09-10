import { describe, expect, it } from "vitest"

import { resolveSupabasePublicKey } from "@/lib/env-public"

const TICKETIV_URL = "https://radsfmlsjznqvcpogluo.supabase.co"

describe("resolveSupabasePublicKey", () => {
  it("prefers an explicitly configured modern publishable key", () => {
    expect(
      resolveSupabasePublicKey(TICKETIV_URL, "sb_publishable_explicit", "legacy-anon"),
    ).toBe("sb_publishable_explicit")
  })

  it("does not use Ticketiv's disabled legacy anon credential", () => {
    const resolved = resolveSupabasePublicKey(TICKETIV_URL, undefined, "legacy-anon")

    expect(resolved).toMatch(/^sb_publishable_/)
    expect(resolved).not.toBe("legacy-anon")
  })

  it("retains legacy compatibility for other Supabase projects", () => {
    expect(
      resolveSupabasePublicKey(
        "https://example.supabase.co",
        undefined,
        "legacy-anon",
      ),
    ).toBe("legacy-anon")
  })
})
