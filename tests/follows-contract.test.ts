import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (p: string) => readFileSync(p, "utf8")

// TICK-434 / TICK-452: follow buttons with public counts on organiser, artist and venue pages.
describe("following on public pages", () => {
  it.each([
    ["app/(public)/organisers/[id]/page.tsx", 'kind="organizer"'],
    ["app/(public)/artists/[id]/page.tsx", 'kind="artist"'],
    ["app/(public)/venues/[slug]/page.tsx", 'kind="venue"'],
  ])("%s renders a FollowButton backed by getFollowSnapshot", (file, kind) => {
    const src = read(file)
    expect(src).toContain("<FollowButton")
    expect(src).toContain(kind)
    expect(src).toContain("getFollowSnapshot(")
  })

  it("counts followers through fn_follower_count, never a select-own table count", () => {
    expect(read("lib/data/public/follows.ts")).toContain('rpc("fn_follower_count"')
    const series = read("lib/data/public/series.ts")
    expect(series).toContain('rpc("fn_follower_count"')
    expect(series).not.toMatch(/from\("series_follows"\)\s*\.select\("id", \{ count: "exact"/)
  })

  it("routes venue follows through fn_set_venue_follow", () => {
    expect(read("app/(consumer)/follows/actions.ts")).toContain('rpc("fn_set_venue_follow"')
  })

  it("keeps venue pages public in the middleware", () => {
    expect(read("lib/supabase/middleware.ts")).toContain('"/venues",')
  })
})
