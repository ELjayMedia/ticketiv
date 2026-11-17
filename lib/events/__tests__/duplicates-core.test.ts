import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import {
  AUTO_FORWARD_HOURS,
  autoForwardAt,
  duplicateGuardMessage,
  duplicateReasons,
  timeLeftLabel,
  unresolvedBlocking,
  type DuplicateMatch,
} from "@/lib/events/duplicates-core"

const match = (over: Partial<DuplicateMatch> = {}): DuplicateMatch => ({
  eventId: "e1",
  title: "Bushfire",
  slug: "bushfire",
  startsAt: "2026-12-05T16:00:00Z",
  tz: "Africa/Mbabane",
  venueName: "House on Fire",
  orgName: "Real Promoters",
  sameVenue: true,
  titleSimilarity: 0.92,
  sharedArtists: 2,
  blocking: true,
  approved: false,
  request: null,
  ...over,
})

describe("duplicate-event guard copy", () => {
  it("explains a match in plain words", () => {
    expect(duplicateReasons(match())).toEqual(["almost the same name", "the same venue", "2 artists in common"])
    expect(duplicateReasons(match({ titleSimilarity: 0.55, sameVenue: false, sharedArtists: 1 }))).toEqual(["a similar name", "an artist in common"])
  })

  it("only counts unapproved blocking matches", () => {
    const list = [match(), match({ eventId: "e2", approved: true }), match({ eventId: "e3", blocking: false })]
    expect(unresolvedBlocking(list).map((m) => m.eventId)).toEqual(["e1"])
  })

  it("sends an unanswered request on after 3 hours and says how long is left", () => {
    expect(AUTO_FORWARD_HOURS).toBe(3)
    const at = autoForwardAt("2026-11-16T09:00:00Z")
    expect(at.toISOString()).toBe("2026-11-16T12:00:00.000Z")
    expect(timeLeftLabel(at, new Date("2026-11-16T09:50:00Z"))).toBe("2 h 10 min")
    expect(timeLeftLabel(at, new Date("2026-11-16T11:52:00Z"))).toBe("8 min")
    expect(timeLeftLabel(at, new Date("2026-11-16T12:30:00Z"))).toBe("any moment now")
  })

  it("turns the database guard's error into an instruction", () => {
    expect(duplicateGuardMessage({ message: "duplicate_event: this event matches …" })).toMatch(/ask Ticketiv support/)
    expect(duplicateGuardMessage({ message: "violates foreign key" })).toBeNull()
  })
})

describe("duplicate-event guard wiring", () => {
  const read = (p: string) => readFileSync(p, "utf8")
  const sql = read("supabase/migrations/20261116120000_event_duplicate_guard.sql")

  it("blocks in the database, not just the form", () => {
    expect(sql).toMatch(/create trigger trg_guard_event_duplicate\s+before insert or update of status, title, venue_id, starts_at, cancelled_at on public\.events/)
    expect(sql).toMatch(/raise exception 'duplicate_event/)
  })

  it("only treats published events from other organisations as originals", () => {
    expect(sql).toMatch(/e\.org_id <> p_org_id/)
    expect(sql).toMatch(/e\.status = 'published'/)
  })

  it("ignores events that are already over", () => {
    const latest = read("supabase/migrations/20261117050000_duplicate_guard_ignore_past_events.sql")
    expect(latest).toMatch(/create or replace function app\.event_duplicate_matches/)
    expect(latest).toMatch(/coalesce\(e\.ends_at, e\.starts_at \+ interval '12 hours'\) > now\(\)/)
  })

  it("auto-forwards to the original organiser after 3 hours, checked every 5 minutes", () => {
    expect(sql).toMatch(/created_at <= now\(\) - interval '3 hours'/)
    expect(sql).toMatch(/cron\.schedule\('ticketiv-duplicate-request-autoforward', '\*\/5 \* \* \* \*'/)
  })

  it("keeps the request table behind RPCs", () => {
    expect(sql).toMatch(/revoke all on public\.event_duplicate_requests from anon, authenticated/)
    expect(sql).not.toMatch(/create policy/i)
    for (const fn of ["fn_request_duplicate_permission", "fn_admin_route_duplicate_request", "fn_decide_duplicate_request", "fn_withdraw_duplicate_request"]) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon;`))
    }
    expect(sql).toMatch(/revoke all on function public\.fn_auto_forward_duplicate_requests\(\) from public, anon, authenticated/)
  })

  it("shows the notice in the event form and checks it before publishing", () => {
    expect(read("app/orgs/[orgId]/events/[eventId]/edit/EventWizardClient.tsx")).toMatch(/<DuplicateEventNotice eventId=\{eventId\}/)
    expect(read("app/api/events/[eventId]/publish/route.ts")).toMatch(/key: "not_duplicate"/)
  })
})
