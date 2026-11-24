import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  ACCESSIBILITY,
  AMENITIES,
  VENUE_TYPES,
  enquiryStatusLabel,
  formatRate,
  formatSpaceCapacity,
  localDateTimeToIso,
  pickKeys,
  rangeFromForm,
  slotConflictMessage,
} from "@/lib/venues/marketplace"
import { venueErrorMessage } from "@/lib/venues/core"
import { buildCalendarRows } from "@/lib/venues/calendar"
import { hasVenueFilters, parseVenueSearch } from "@/lib/venues/search-params"

const sql = readFileSync("supabase/migrations/20261124200000_tick482_460_venue_marketplace.sql", "utf8")
const arrayIn = (fn: string) => (sql.match(new RegExp(`${fn}\\(\\) returns text\\[\\][\\s\\S]*?array\\[([\\s\\S]*?)\\]`)) ?? [])[1]?.match(/'([a-z_]+)'/g)?.map((x) => x.slice(1, -1)) ?? []

describe("keys match the database whitelists", () => {
  it("amenities", () => expect(Object.keys(AMENITIES).sort()).toEqual(arrayIn("venue_amenity_keys").sort()))
  it("accessibility", () => expect(Object.keys(ACCESSIBILITY).sort()).toEqual(arrayIn("venue_accessibility_keys").sort()))
  it("venue types", () => {
    const m = sql.match(/venue_type in \(([^)]*)\)/)
    expect(m).not.toBeNull()
    expect(Object.keys(VENUE_TYPES).sort()).toEqual(m![1].match(/'([a-z_]+)'/g)!.map((x) => x.slice(1, -1)).sort())
  })
})

describe("formatting", () => {
  it("rates", () => {
    expect(formatRate(1500000, "SZL", "day")).toBe("SZL 15,000 per day")
    expect(formatRate(12550, "SZL", "hour")).toBe("SZL 125.50 per hour")
    expect(formatRate(null, "SZL", "day")).toBeNull()
    expect(formatRate(100, "SZL", "fortnight")).toBeNull()
  })
  it("capacity", () => {
    expect(formatSpaceCapacity(800, 400)).toBe("Standing 800 · seated 400")
    expect(formatSpaceCapacity(null, 120)).toBe("Seated 120")
    expect(formatSpaceCapacity(null, null)).toBeNull()
  })
  it("keeps only known keys in a stable order", () => {
    expect(pickKeys(["bar", "helipad", "stage", "bar"], AMENITIES)).toEqual(["stage", "bar"])
  })
  it("status labels", () => {
    expect(enquiryStatusLabel("open")).toBe("Waiting for the venue")
    expect(enquiryStatusLabel("accepted")).toBe("Accepted")
  })
})

describe("form dates are Eswatini local time", () => {
  it("converts to UTC", () => {
    expect(localDateTimeToIso("2026-12-24", "18:30")).toBe("2026-12-24T16:30:00.000Z")
    expect(localDateTimeToIso("24/12/2026", "18:30")).toBeNull()
  })
  it("rolls an earlier end time to the next day", () => {
    expect(rangeFromForm("2026-12-24", "20:00", "02:00")).toEqual({ startsAt: "2026-12-24T18:00:00.000Z", endsAt: "2026-12-25T00:00:00.000Z" })
    expect(rangeFromForm("2026-12-24", "18:00", "23:00")).toEqual({ startsAt: "2026-12-24T16:00:00.000Z", endsAt: "2026-12-24T21:00:00.000Z" })
  })
})

describe("errors", () => {
  it("explains each slot conflict", () => {
    expect(venueErrorMessage({ message: "slot_unavailable", details: "blocked" })).toMatch(/blocked that time/)
    expect(venueErrorMessage({ message: "slot_unavailable", details: "event" })).toMatch(/event is already on/)
    expect(slotConflictMessage(undefined)).toBe("That time is no longer free.")
  })
  it("has copy for marketplace codes", () => {
    expect(venueErrorMessage({ message: "venue_not_listed" })).toMatch(/isn't taking enquiries/)
    expect(venueErrorMessage({ message: "space_has_bookings" })).toMatch(/upcoming bookings/)
    expect(venueErrorMessage({ message: "space_not_found" })).toBe("That space no longer exists.")
  })
})

describe("calendar rows", () => {
  it("merges, hides cancelled bookings and shows a booked event once", () => {
    const rows = buildCalendarRows({
      bookings: [
        { id: "b1", spaceId: null, enquiryId: "e1", orgId: "o", orgName: "Org", eventId: "ev1", startsAt: "2026-12-02T16:00:00Z", endsAt: "2026-12-02T21:00:00Z", status: "confirmed" },
        { id: "b2", spaceId: null, enquiryId: null, orgId: "o", orgName: "Org", eventId: null, startsAt: "2026-12-01T16:00:00Z", endsAt: "2026-12-01T21:00:00Z", status: "cancelled" },
      ],
      blocks: [{ id: "k1", spaceId: null, startsAt: "2026-12-01T00:00:00Z", endsAt: "2026-12-02T00:00:00Z", note: "Maintenance" }],
      events: [
        { id: "ev1", title: "Booked event", slug: "booked", startsAt: "2026-12-02T16:00:00Z", endsAt: null },
        { id: "ev2", title: "Walk-in event", slug: "walk", startsAt: "2026-12-03T16:00:00Z", endsAt: null },
      ],
    })
    expect(rows.map((r) => `${r.kind}:${r.id}`)).toEqual(["block:k1", "booking:b1", "event:ev2"])
    expect(rows[2].endsAt).toBe("2026-12-03T22:00:00.000Z")
  })
})

describe("venue search params", () => {
  it("parses and ignores junk", () => {
    const f = parseVenueSearch({ city: " Manzini ", min: "100", max: "-3", type: "club", date: "2026-12-24" })
    expect(f).toEqual({ city: "Manzini", minCapacity: 100, maxCapacity: null, venueType: "club", date: "2026-12-24" })
    expect(parseVenueSearch({ type: "spaceship", date: "tomorrow" })).toEqual({ city: null, minCapacity: null, maxCapacity: null, venueType: null, date: null })
    expect(hasVenueFilters(parseVenueSearch({}))).toBe(false)
  })
})

describe("wiring", () => {
  const read = (p: string) => readFileSync(p, "utf8")
  it("venue workspace has spaces, calendar and enquiries", () => {
    const nav = read("components/quiet/shell/venue-nav.tsx")
    for (const path of ["spaces", "calendar", "enquiries"]) expect(nav).toContain(`path: "${path}"`)
  })
  it("organiser workspace links venue enquiries for managers only", () => {
    expect(read("components/quiet/shell/org-nav.tsx")).toContain('section: "venues", path: "venue-enquiries"')
    expect(read("app/orgs/[orgId]/venue-enquiries/page.tsx")).toContain('requireOrganizerSection(orgId, "venues")')
  })
  it("the public venue page offers enquiries only for verified venues", () => {
    const page = read("app/(public)/venues/[slug]/page.tsx")
    expect(page).toMatch(/\{verified \? \(\s*<Card>\s*<CardBody[^>]*>\s*<h2 className="text-h3">Enquire about a date/)
  })
  it("the database has the double-booking constraint", () => {
    expect(sql).toMatch(/constraint venue_bookings_no_overlap exclude using gist/)
  })
})
