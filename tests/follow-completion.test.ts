import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { PUBLIC_FOLLOWER_THRESHOLD, publicFollowerCount } from "@/lib/follows/threshold"
import { parseFollowerTrend, sparklinePoints } from "@/lib/follows/trend"
import { followHref, groupFollows, mapMyFollows } from "@/lib/follows/my-follows"

const read = (p: string) => readFileSync(p, "utf8")

describe("public follower threshold (TICK-434)", () => {
  it("hides counts below 50 and shows them from 50", () => {
    expect(PUBLIC_FOLLOWER_THRESHOLD).toBe(50)
    expect(publicFollowerCount(0)).toBeNull()
    expect(publicFollowerCount(49)).toBeNull()
    expect(publicFollowerCount(50)).toBe(50)
    expect(publicFollowerCount(1200)).toBe(1200)
    expect(publicFollowerCount(undefined)).toBeNull()
    expect(publicFollowerCount(Number.NaN)).toBeNull()
  })

  it("matches the database threshold", () => {
    const sql = read("supabase/migrations/20261124190000_tick434_452_follow_completion.sql")
    expect(sql).toMatch(/select 50 \$\$/)
  })

  it("is applied by the follow button and the series page", () => {
    expect(read("components/follows/follow-button.tsx")).toContain("publicFollowerCount(count)")
    expect(read("app/(public)/series/[slug]/page.tsx")).toContain("publicFollowerCount(followState.followerCount)")
  })
})

describe("followers trend", () => {
  it("parses the RPC payload and rejects junk", () => {
    expect(parseFollowerTrend(null)).toBeNull()
    expect(parseFollowerTrend({ total: "1" })).toBeNull()
    const t = parseFollowerTrend({ total: 5, new_30d: 2, daily: [{ day: "2026-11-23", total: 4 }, { bad: 1 }, { day: "2026-11-24", total: 5 }], public_threshold: 50 })
    expect(t).toEqual({ total: 5, new30d: 2, daily: [{ day: "2026-11-23", total: 4 }, { day: "2026-11-24", total: 5 }], publicThreshold: 50 })
  })

  it("draws a sparkline inside the box", () => {
    expect(sparklinePoints([], 100, 20)).toBe("")
    expect(sparklinePoints([3, 3], 100, 20)).toBe("0,10 100,10")
    expect(sparklinePoints([0, 5, 10], 100, 20)).toBe("0,20 50,10 100,0")
  })

  it("is on the organiser dashboard", () => {
    const page = read("app/orgs/[orgId]/dashboard/page.tsx")
    expect(page).toContain("getOrgFollowerTrend(orgId)")
    expect(page).toContain("<FollowersCard")
  })
})

describe("my follows (TICK-452)", () => {
  it("links each kind to its public page", () => {
    expect(followHref("organizer", "o1", "slug")).toBe("/organisers/o1")
    expect(followHref("artist", "a1", null)).toBe("/artists/a1")
    expect(followHref("series", "s1", "tour")).toBe("/series/tour")
    expect(followHref("venue", "v1", "hall")).toBe("/venues/hall")
  })

  it("maps rows and groups them in a fixed order", () => {
    const follows = mapMyFollows([
      { kind: "venue", id: "v1", name: "Hall", slug: "hall", image_url: null, followed_at: "2026-11-24T00:00:00Z" },
      { kind: "organizer", id: "o1", name: "Org", slug: "org", image_url: "https://x/logo.png", followed_at: "2026-11-23T00:00:00Z" },
      { kind: "nonsense", id: "x", name: "x" },
      null,
    ])
    expect(follows).toHaveLength(2)
    expect(groupFollows(follows).map((g) => g.kind)).toEqual(["organizer", "venue"])
    expect(follows[1].imageUrl).toBe("https://x/logo.png")
  })

  it("has a /me/following page linked from the profile", () => {
    expect(read("app/(consumer)/me/following/page.tsx")).toContain("getMyFollows()")
    expect(read("components/quiet/screens/profile/profile-screen.tsx")).toContain('href: "/me/following"')
    expect(read("lib/data/attendee/profile.ts")).toContain('rpc("fn_my_follows"')
  })
})

describe("post-purchase follow prompt (TICK-434)", () => {
  it("shows for signed-in buyers of paid orders only", () => {
    const page = read("app/(focused)/orders/[orderId]/confirmation/page.tsx")
    expect(page).toContain('!isAnonymous && props.state === "paid"')
    expect(page).toContain("<PostPurchaseFollow")
  })
})

describe("series alerts are delivered", () => {
  it("series_new_event is a push type and has copy", () => {
    expect(read("lib/notifications/reminder-email-template.ts")).toContain('"series_new_event"')
    expect(read("lib/data/attendee/notifications.ts")).toContain('type === "series_new_event"')
  })
})
