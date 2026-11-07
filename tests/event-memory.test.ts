import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { parseFeedbackSummary } from "@/lib/data/companion-memory"

const sql = readFileSync(resolve(__dirname, "../supabase/migrations/20261111100000_companion_release_3.sql"), "utf8")

describe("event memory migration", () => {
  it("keeps ratings private: people read only their own, organisers get an anonymous summary", () => {
    expect(sql).toMatch(/create policy event_feedback_select_own on public\.event_feedback\s+for select to authenticated\s+using \(user_id = \(select auth\.uid\(\)\)\);/)
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*event_feedback/i)
    const summary = sql.slice(sql.indexOf("create or replace function public.fn_event_feedback_summary"), sql.indexOf("-- 3. Highlights"))
    expect(summary).not.toMatch(/user_id/)
    expect(summary).toMatch(/app\.is_org_member_of\(v_org\) or app\.is_platform_admin\(\)/)
  })

  it("only lets ticket holders rate, and only once the event has started", () => {
    expect(sql).toMatch(/if now\(\) < v_starts then/)
    expect(sql).toMatch(/if not app\.holds_ticket_for_event\(p_event_id\) then/)
  })

  it("accepts highlight photos only from this event's own upload folder", () => {
    expect(sql).toMatch(/\/storage\/v1\/object\/public\/event-covers\/events\/' \|\| p_event_id::text/)
    expect(sql).toMatch(/if v_count >= 12 then/)
  })

  it("alerts followers once per event and never blocks publishing", () => {
    expect(sql).toMatch(/'organizer_new_event:' \|\| new\.id::text \|\| ':' \|\| f\.user_id::text/)
    expect(sql).toMatch(/when others then\s+raise warning 'organiser follower alert failed/)
  })

  it("keeps the scheduled jobs server-only", () => {
    for (const fn of ["fn_feedback_requests_tick", "fn_reminder_emails_tick"]) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${fn}\\(\\) from public, anon, authenticated;`))
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${fn}\\(\\) to service_role;`))
    }
  })
})

describe("parseFeedbackSummary", () => {
  it("reads the RPC's JSON and tolerates gaps", () => {
    const parsed = parseFeedbackSummary({ count: 3, average: 4.3, distribution: { "5": 2, "4": 1 }, comments: [{ rating: 5, comment: "Loved it", at: "2026-11-16T22:00:00Z" }, { rating: 3 }] })
    expect(parsed.count).toBe(3)
    expect(parsed.average).toBe(4.3)
    expect(parsed.distribution).toEqual({ "1": 0, "2": 0, "3": 0, "4": 1, "5": 2 })
    expect(parsed.comments).toHaveLength(1)
    expect(parseFeedbackSummary(null)).toEqual({ count: 0, average: null, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }, comments: [] })
  })
})
