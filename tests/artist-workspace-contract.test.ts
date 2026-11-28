import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

// TICK-353 / TICK-484: artist claims, workspace and press kit wiring.
describe("artist workspace", () => {
  it("routes the talent context into the artist workspace for owners and managers", () => {
    const ctx = read("lib/data/identity/contexts.ts")
    expect(ctx).toContain('r.source === "artist_members"')
    expect(ctx).toContain("href: `/manage/artists/${id}`")
  })

  it("admits only artist members to /manage/artists", () => {
    expect(read("app/manage/artists/[artistId]/layout.tsx")).toContain('if (!access) return redirect("/403")')
    expect(read("lib/artists/access.ts")).toContain('from("artist_members")')
  })

  it("writes the profile only through fn_update_artist_profile", () => {
    const actions = read("app/manage/artists/[artistId]/actions.ts")
    expect(actions).toContain('rpc("fn_update_artist_profile"')
    expect(actions).not.toMatch(/from\("artists"\)\s*\.update/)
  })

  it("sends a taken name to the claim flow instead of failing", () => {
    expect(read("app/onboarding/talent/actions.ts")).toContain("artist_exists")
    expect(read("app/onboarding/talent/page.tsx")).toContain("<ArtistClaim")
  })

  it("renders only https links and press kits on the public page", () => {
    const page = read("app/(public)/artists/[id]/page.tsx")
    expect(page).toContain('rel="noopener noreferrer nofollow"')
    expect(page).toMatch(/\^https:/)
  })
})
