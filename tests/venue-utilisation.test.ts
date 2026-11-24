import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { acceptanceRate, addDays, monthLabel, parseUtilisation, venueLocalDate } from "@/lib/venues/utilisation"

describe("venue utilisation (TICK-483)", () => {
  it("parses the RPC payload", () => {
    const u = parseUtilisation({
      from: "2026-12-01", to: "2026-12-30", days: 30, occupied_days: 4, blocked_days: 1, occupancy_pct: 13.3, bookings: 3,
      booked_hours: 23, events: 1, enquiries_received: 2, enquiries_accepted: 1, whole_venue_bookings: 1,
      spaces: [{ space_id: "s1", name: "Hall", bookings: 1, booked_hours: 5 }],
      months: [{ month: "2026-12", days: 30, occupied_days: 4 }],
    })
    expect(u).toMatchObject({ occupiedDays: 4, occupancyPct: 13.3, bookedHours: 23, spaces: [{ name: "Hall", bookedHours: 5 }], months: [{ month: "2026-12", occupiedDays: 4 }] })
    expect(parseUtilisation(null)).toBeNull()
    expect(parseUtilisation({ days: "30" })).toBeNull()
  })

  it("acceptance rate and labels", () => {
    expect(acceptanceRate({ enquiriesReceived: 3, enquiriesAccepted: 1 })).toBe(33)
    expect(acceptanceRate({ enquiriesReceived: 0, enquiriesAccepted: 0 })).toBeNull()
    expect(monthLabel("2026-12")).toBe("Dec 2026")
    expect(monthLabel("bad")).toBe("bad")
  })

  it("dates are venue-local", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Mbabane (UTC+2).
    expect(venueLocalDate(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
  })

  it("is shown on the venue overview, and the payload has no attendee data", () => {
    const page = readFileSync("app/manage/venues/[venueId]/page.tsx", "utf8")
    expect(page).toContain("<UtilisationCard")
    const sql = readFileSync("supabase/migrations/20261124210000_tick483_venue_utilisation.sql", "utf8")
    expect(sql).not.toMatch(/order_items|orders|buyer|email|phone/)
    expect(sql).toMatch(/app\.is_venue_member\(p_venue_id\) or app\.is_platform_admin\(\)/)
  })
})
