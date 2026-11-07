import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import { guideCompleteness, guidePlanFacts, mapGuide } from "@/lib/data/companion"
import { eventLocalDate, guideFromForm, localTime } from "@/lib/organizer/guide-form"
import { canDo } from "@/lib/super-admin/console"

const START = "2026-11-16T12:00:00Z" // Sat 16 Nov, 14:00 in Eswatini

function form(entries: Array<[string, string]>) {
  const f = new FormData()
  for (const [k, v] of entries) f.append(k, v)
  return f
}

describe("guideFromForm", () => {
  it("turns doors into a time on the event day in Eswatini", () => {
    const { guide, errors } = guideFromForm(form([["doors", "13:30"]]), START)
    expect(errors).toEqual([])
    expect(guide.doors_open_at).toBe("2026-11-16T11:30:00.000Z") // 13:30 in Eswatini
    expect(localTime(guide.doors_open_at as string)).toBe("13:30")
  })

  it("keeps running-order lines in time order and skips blank rows", () => {
    const { guide, errors } = guideFromForm(
      form([
        ["programme_time", "19:00"], ["programme_title", "Sipho M"], ["programme_where", "Main stage"],
        ["programme_time", ""], ["programme_title", ""], ["programme_where", ""],
        ["programme_time", "9:30"], ["programme_title", "Gates open"], ["programme_where", ""],
      ]),
      START,
    )
    expect(errors).toEqual([])
    expect(guide.programme).toEqual([
      { time: "09:30", title: "Gates open", where: null },
      { time: "19:00", title: "Sipho M", where: "Main stage" },
    ])
  })

  it("explains what to fix in plain words", () => {
    const { errors } = guideFromForm(
      form([
        ["doors", "2pm"],
        ["programme_time", "25:00"], ["programme_title", "Late"], ["programme_where", ""],
        ["facility_label", "Toilets"], ["facility_detail", ""],
      ]),
      START,
    )
    expect(errors).toEqual([
      "Doors time must look like 14:00.",
      "Running order line 1: the time must look like 19:00.",
      "Venue info line 1: fill in both the name and where it is.",
    ])
  })

  it("needs an event date before a doors time", () => {
    expect(guideFromForm(form([["doors", "14:00"]]), null).errors).toEqual(["Set the event date before the doors time."])
    expect(eventLocalDate("2026-11-15T22:30:00Z")).toBe("2026-11-16")
  })
})

describe("guide summaries", () => {
  const guide = mapGuide({
    doors_open_at: "2026-11-16T11:30:00Z",
    entrance: "Main entrance",
    parking: "Free parking on site, overflow at the school field down the road",
    age_rule: "18+ with ID",
    programme: [{ time: "15:00", title: "DJ Nala" }],
    facilities: [{ label: "Toilets", detail: "Behind the VIP deck" }, { label: "Broken" }],
  })

  it("lists short planning facts for the public event page", () => {
    expect(guidePlanFacts(guide)).toEqual([
      ["Doors", "13:30"],
      ["Ages", "18+ with ID"],
      ["Parking", "Free parking on site, overflow at the sch…"],
    ])
    expect(guidePlanFacts(null)).toEqual([])
  })

  it("counts the essentials an organiser has filled in", () => {
    expect(guideCompleteness(guide)).toEqual({ filled: 4, total: 6, missing: ["Getting there", "Help contact"] })
    expect(guideCompleteness(null).filled).toBe(0)
    expect(guide?.facilities).toEqual([{ label: "Toilets", detail: "Behind the VIP deck" }])
  })
})

describe("admin roles", () => {
  it("lets support, event ops and the owner hide updates, not finance or read-only", () => {
    expect(canDo("hide_event_update", "support_admin")).toBe(true)
    expect(canDo("hide_event_update", "event_ops_admin")).toBe(true)
    expect(canDo("hide_event_update", "finance_admin")).toBe(false)
    expect(canDo("hide_event_update", "read_only_admin")).toBe(false)
  })
})

describe("event companion migration", () => {
  const sql = readFileSync(resolve(__dirname, "../supabase/migrations/20261109100000_event_companion.sql"), "utf8")

  it("keeps writes behind organiser-checked functions", () => {
    expect(sql).toMatch(/revoke all on public\.event_guides from anon, authenticated;/)
    expect(sql).toMatch(/revoke all on public\.event_updates from anon, authenticated;/)
    expect(sql).not.toMatch(/grant (insert|update|delete)[^;]*event_(guides|updates)/i)
    for (const fn of ["fn_save_event_guide", "fn_post_event_update", "fn_hide_event_update"]) {
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon;`))
    }
    expect(sql.match(/app\.is_org_manager\(/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it("never calls is_platform_admin from the anon policy", () => {
    const anonPolicy = sql.slice(sql.indexOf("create policy event_guides_select_public"), sql.indexOf("drop policy if exists event_guides_select on"))
    expect(anonPolicy).toContain("to anon")
    expect(anonPolicy).not.toContain("is_platform_admin")
  })

  it("shows ticket holders only updates that are not hidden", () => {
    expect(sql).toMatch(/\(hidden_at is null and app\.holds_ticket_for_event\(event_id\)\)/)
  })
})

describe("guide in another zone", () => {
  it("reads doors in the event's own zone", () => {
    // 19:00 on 16 Nov in Lagos (UTC+1) is 18:00Z
    const { guide } = guideFromForm(form([["doors", "19:00"]]), "2026-11-16T17:00:00Z", "Africa/Lagos")
    expect(guide.doors_open_at).toBe("2026-11-16T18:00:00.000Z")
  })
})
