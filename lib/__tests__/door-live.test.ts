import { describe, expect, it } from "vitest"

import { DEFAULT_GATE, scannerState, summariseDoor, type DoorScanRow } from "@/lib/organizer/door-live"

const NOW = Date.parse("2026-11-16T15:00:00Z")
const ago = (min: number) => new Date(NOW - min * 60 * 1000).toISOString()
const scan = (outcome: string, gate: string | null, minAgo: number, code = "TKT-ABCD1234"): DoorScanRow => ({
  outcome,
  gate,
  device_id: null,
  scanned_at: ago(minAgo),
  ticket_code: code,
})

describe("summariseDoor", () => {
  it("counts entries against sold and works out the pace from the last 15 minutes", () => {
    const scans = [...Array.from({ length: 30 }, (_, i) => scan("valid", "North", i % 15)), scan("validated", "North", 40)]
    const s = summariseDoor({ scans, devices: [], sold: 200, entered: null, nowMs: NOW })
    expect(s.entered).toBe(31)
    expect(s.enteredPct).toBe(16)
    expect(s.perMinute).toBe(2)
  })

  it("prefers live stats for the entered count and handles nothing sold", () => {
    const s = summariseDoor({ scans: [scan("valid", null, 1)], devices: [], sold: 0, entered: 57, nowMs: NOW })
    expect(s.entered).toBe(57)
    expect(s.enteredPct).toBeNull()
  })

  it("flags an entrance that stopped while others keep moving, and puts it first", () => {
    const scans = [scan("valid", "North", 2), scan("valid", "North", 5), scan("valid", "South", 25)]
    const s = summariseDoor({ scans, devices: [], sold: 10, entered: null, nowMs: NOW })
    expect(s.entrances[0]).toMatchObject({ name: "South", stalled: true })
    expect(s.entrances[1]).toMatchObject({ name: "North", stalled: false, recent: 2 })
  })

  it("groups scans with no gate under the main entrance", () => {
    const s = summariseDoor({ scans: [scan("valid", null, 1), scan("valid", "  ", 2)], devices: [], sold: 5, entered: null, nowMs: NOW })
    expect(s.entrances).toHaveLength(1)
    expect(s.entrances[0].name).toBe(DEFAULT_GATE)
  })

  it("lists the last hour's problems with advice and only the last four characters of the code", () => {
    const scans = [scan("duplicate", "North", 3, "TKT-SECRET-9F2A"), scan("wrong_event", "South", 10), scan("not_found", "South", 90)]
    const s = summariseDoor({ scans, devices: [], sold: 10, entered: 0, nowMs: NOW })
    expect(s.problems).toHaveLength(2)
    expect(s.problems[0]).toMatchObject({ label: "Already used", gate: "North", codeHint: "9F2A" })
    expect(s.problems[0].advice).toMatch(/photo ID/)
    expect(JSON.stringify(s.problems)).not.toContain("SECRET")
    expect(s.problemCounts).toEqual(
      expect.arrayContaining([
        { outcome: "Already used", label: "Already used", count: 1 },
        { outcome: "Wrong event", label: "Wrong event", count: 1 },
      ]),
    )
  })

  it("rates scanners by when they last checked in, offline first", () => {
    expect(scannerState(ago(1), NOW)).toBe("online")
    expect(scannerState(ago(6), NOW)).toBe("quiet")
    expect(scannerState(ago(30), NOW)).toBe("offline")
    expect(scannerState(null, NOW)).toBe("offline")
    const s = summariseDoor({
      scans: [],
      devices: [
        { id: "a", label: "Gate 1", last_seen_at: ago(1) },
        { id: "b", label: null, last_seen_at: ago(45) },
      ],
      sold: 0,
      entered: 0,
      nowMs: NOW,
    })
    expect(s.scanners.map((d) => [d.label, d.state])).toEqual([
      ["Unnamed scanner", "offline"],
      ["Gate 1", "online"],
    ])
  })
})
