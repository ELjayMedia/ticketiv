import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Ticket sales are organizer-only. Attendee-facing cards and event pages must
 * not show how many tickets sold ("7 sold"), directly or as "N going".
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const ATTENDEE_SURFACES = [
  "lib/mappers/discover.ts",
  "lib/mappers/search.ts",
  "components/standardized/event-card-standard.tsx",
  "components/quiet/screens/discover/mobile-discover.tsx",
  "components/quiet/screens/discover/desktop-discover.tsx",
  "components/quiet/screens/discover/suggested-events-row.tsx",
  "components/quiet/screens/search/search-results.tsx",
]

describe("attendees never see ticket sales counts", () => {
  it("cards and search results don't format or render a sold count", () => {
    for (const file of ATTENDEE_SURFACES) {
      const source = read(file)
      expect(source, file).not.toContain("formatSoldCount")
      expect(source, file).not.toMatch(/soldLabel|trustLabel/)
    }
  })

  it("the event page's going chip isn't fed from tickets sold", () => {
    for (const file of ["app/(focused)/events/[id]/page.tsx", "components/quiet/screens/event-detail/live-event-shell.tsx"]) {
      const source = read(file)
      expect(source, file).not.toMatch(/attendeeCount[^\n]*tickets_sold/)
      expect(source, file).not.toMatch(/soldCount:\s*[^\n]*tickets_sold/)
    }
  })

  it("public event data carries no sales (migration 20261103100000)", () => {
    const migration = read("supabase/migrations/20261103100000_hide_public_sales_data.sql")
    // event_live_stats becomes organizer-only, including the public read policy.
    expect(migration).toContain("drop policy if exists event_live_stats_public_read on public.event_live_stats")
    const orgRead = migration.slice(migration.indexOf("alter policy event_live_stats_org_read"), migration.indexOf("-- 3."))
    expect(orgRead).not.toContain("visibility")
    // The attendee-safe function and the rebuilt card view never select sales.
    const fn = migration.slice(migration.indexOf("create or replace function public.fn_event_public_live_stats"), migration.indexOf("comment on function"))
    const view = migration.slice(migration.indexOf("create view public.v_public_event_cards"), migration.indexOf("comment on view"))
    for (const part of [fn, view]) {
      expect(part).not.toMatch(/tickets_sold|gross_sales|successful_payments|failed_payments|last_order_at/)
    }
    expect(migration).toContain("null::integer as tickets_sold")
    expect(migration).toContain("revoke all on public.v_event_sales_public from public, anon, authenticated")
  })

  it("attendee pages read the safe function, not the organizer-only table", () => {
    const page = read("app/(focused)/events/[id]/page.tsx")
    expect(page).toContain("fn_event_public_live_stats")
    expect(page).not.toContain('.from("event_live_stats")')
    expect(read("lib/hooks/use-event-live-stats.ts")).toContain("fn_event_public_live_stats")
  })
})
