import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

// TICK-353 safeguards wiring.
describe("artist claim safeguards", () => {
  it("offers a claim entry point on unclaimed public artist pages", () => {
    const page = read("app/(public)/artists/[id]/page.tsx")
    expect(page).toContain("Claim this profile")
    expect(page).toContain("/onboarding/talent?claim=")
  })

  it("redirects merged profiles to the canonical artist", () => {
    expect(read("app/(public)/artists/[id]/page.tsx")).toContain('from("artist_redirects")')
  })

  it("exposes merge and rollback only through admin actions", () => {
    const actions = read("app/super-admin/artist-claims/actions.ts")
    expect(actions).toContain('rpc("fn_admin_merge_artists"')
    expect(actions).toContain('rpc("fn_admin_reset_artist_owner"')
    expect(actions.match(/adminForAction\("review_artist_claim"\)/g)?.length).toBeGreaterThanOrEqual(3)
  })
})
