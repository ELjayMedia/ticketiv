import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { BOOKING_ERROR_COPY, bookingErrorMessage, bookingStatusLabel, formatOffer, isOpenBooking, parseArtistInsights, turnoutPct } from "@/lib/artists/bookings"

const sql = readFileSync("supabase/migrations/20261124220000_tick461_485_486_artist_bookings.sql", "utf8")
const read = (p: string) => readFileSync(p, "utf8")

describe("artist booking copy (TICK-461)", () => {
  it("labels statuses", () => {
    expect(bookingStatusLabel("open")).toBe("Waiting for the artist")
    expect(bookingStatusLabel("countered")).toBe("Counter-offer")
    expect(bookingStatusLabel("accepted")).toBe("Confirmed")
    expect(isOpenBooking("countered")).toBe(true)
    expect(isOpenBooking("accepted")).toBe(false)
  })
  it("formats offer ranges", () => {
    expect(formatOffer(500000, 800000, "SZL")).toBe("SZL 5,000 – 8,000")
    expect(formatOffer(null, 800000, "SZL")).toBe("Up to SZL 8,000")
    expect(formatOffer(500000, null, "SZL")).toBe("From SZL 5,000")
    expect(formatOffer(500000, 500000, "SZL")).toBe("SZL 5,000")
    expect(formatOffer(null, null, "SZL")).toBeNull()
  })
  it("has copy for every error the RPCs raise", () => {
    const raised = new Set([...sql.matchAll(/raise exception '([a-z_]+)'/g)].map((m) => m[1]))
    for (const code of raised) expect(BOOKING_ERROR_COPY, code).toHaveProperty(code)
    expect(bookingErrorMessage({ message: "booking_open_limit" })).toMatch(/2 open requests/)
  })
})

describe("insights (TICK-486)", () => {
  it("parses the payload", () => {
    const i = parseArtistInsights({ followers: 2, followers_30d: 1, past_events: 1, upcoming_events: 0, tickets_sold: 120, checked_in: 97, confirmed_bookings: 2, open_requests: 0,
      events: [{ event_id: "e", title: "Gig", slug: "gig", starts_at: "2026-11-01T18:00:00Z", tickets_sold: 120, checked_in: 97 }] })
    expect(i).toMatchObject({ followers: 2, ticketsSold: 120, events: [{ title: "Gig", checkedIn: 97 }] })
    expect(parseArtistInsights({})).toBeNull()
    expect(turnoutPct(120, 97)).toBe(81)
    expect(turnoutPct(0, 0)).toBeNull()
  })
  it("never reads buyer data", () => {
    const fn = sql.slice(sql.indexOf("create or replace function public.fn_artist_insights"), sql.indexOf("-- ── announcements"))
    expect(fn).not.toMatch(/order_items|orders|buyer|email|phone|auth\.users/)
  })
  it("announcements are in-app only and respect the in-app preference", () => {
    const fn = sql.slice(sql.indexOf("create or replace function public.fn_post_artist_announcement"), sql.indexOf("alter table public.notifications"))
    expect(fn).toContain("'in_app'")
    expect(fn).toContain("coalesce(p.in_app_opt_in, true)")
    expect(fn).not.toMatch(/'email'|'sms'|'push'/)
  })
})

describe("wiring", () => {
  it("only claimed artists show the request form", () => {
    const page = read("app/(public)/artists/[id]/page.tsx")
    expect(page).toContain("const bookingPanel = claimed ? (")
    expect(page).toContain("Is this you? Claim this profile")
  })
  it("artist workspace has bookings and insights; organisers have artist bookings", () => {
    const nav = read("components/quiet/shell/artist-nav.tsx")
    expect(nav).toContain('path: "bookings"')
    expect(nav).toContain('path: "insights"')
    expect(read("components/quiet/shell/org-nav.tsx")).toContain('section: "bookings", path: "artist-bookings"')
  })
})
