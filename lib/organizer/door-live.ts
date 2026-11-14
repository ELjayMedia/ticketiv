/**
 * Door-day live view: turns raw scans, scanner devices and live stats into
 * the four answers an organiser needs at the gate. How many have come in?
 * How fast? Which entrance is struggling? What needs a person to sort out?
 * Pure so it can be tested without a database.
 */

export interface DoorScanRow {
  outcome: string | null
  gate: string | null
  device_id: string | null
  scanned_at: string
  ticket_code: string | null
}

export interface DoorDeviceRow {
  id: string
  label: string | null
  last_seen_at: string | null
}

export type ScannerState = "online" | "quiet" | "offline"

export interface DoorEntrance {
  name: string
  entered: number
  /** Successful entries in the last 15 minutes. */
  recent: number
  /** Entries per minute over the last 15 minutes. */
  perMinute: number
  problems: number
  lastScanAt: string | null
  /** No successful scan for 10+ minutes while other entrances are moving. */
  stalled: boolean
}

export interface DoorProblem {
  outcome: string
  label: string
  advice: string
  gate: string
  at: string
  /** Last four characters only: enough to match a ticket, not to copy one. */
  codeHint: string | null
}

export interface DoorLiveSummary {
  sold: number
  entered: number
  /** 0–100, rounded; null when nothing is sold. */
  enteredPct: number | null
  perMinute: number
  lastScanAt: string | null
  entrances: DoorEntrance[]
  scanners: Array<{ id: string; label: string; state: ScannerState; lastSeenAt: string | null }>
  problems: DoorProblem[]
  problemCounts: Array<{ outcome: string; label: string; count: number }>
}

const SUCCESS = new Set(["valid", "validated"])
const RECENT_MS = 15 * 60 * 1000
const STALL_MS = 10 * 60 * 1000
const PROBLEM_WINDOW_MS = 60 * 60 * 1000

export const DEFAULT_GATE = "Main entrance"

const PROBLEM_COPY: Record<string, { label: string; advice: string }> = {
  duplicate: { label: "Already used", advice: "Check photo ID against the order, then look the ticket up before letting anyone in." },
  already_used: { label: "Already used", advice: "Check photo ID against the order, then look the ticket up before letting anyone in." },
  wrong_event: { label: "Wrong event", advice: "The ticket is for a different event or date. Point them to the right venue or box office." },
  not_found: { label: "Not recognised", advice: "Ask them to open the ticket in the Ticketiv app; screenshots of old codes fail." },
  revoked: { label: "Cancelled ticket", advice: "This ticket was cancelled. Send them to the box office or support." },
  refunded: { label: "Refunded ticket", advice: "This ticket was refunded. They need a new ticket to enter." },
  transferred: { label: "Sent to someone else", advice: "The ticket now belongs to another person. Ask for the new holder's ticket." },
  not_paid: { label: "Not paid", advice: "Payment didn't complete. Send them to the box office." },
  unauthorized: { label: "Scanner not allowed", advice: "This device isn't paired to this event. Re-pair it from the scanner screen." },
}

export function problemCopy(outcome: string): { label: string; advice: string } {
  return PROBLEM_COPY[outcome] ?? { label: "Scan failed", advice: "Try the scan again; if it keeps failing, look the ticket up by name." }
}

export function scannerState(lastSeenAt: string | null, nowMs: number): ScannerState {
  if (!lastSeenAt) return "offline"
  const age = nowMs - new Date(lastSeenAt).getTime()
  if (age <= 2 * 60 * 1000) return "online"
  if (age <= 10 * 60 * 1000) return "quiet"
  return "offline"
}

export function summariseDoor(input: {
  scans: ReadonlyArray<DoorScanRow>
  devices: ReadonlyArray<DoorDeviceRow>
  sold: number | null
  entered: number | null
  nowMs: number
}): DoorLiveSummary {
  const { scans, devices, nowMs } = input
  const ok = scans.filter((s) => s.outcome && SUCCESS.has(s.outcome))
  const bad = scans.filter((s) => !s.outcome || !SUCCESS.has(s.outcome))
  const time = (s: DoorScanRow) => new Date(s.scanned_at).getTime()
  const gateOf = (s: DoorScanRow) => s.gate?.trim() || DEFAULT_GATE

  const byGate = new Map<string, { ok: DoorScanRow[]; bad: DoorScanRow[] }>()
  for (const s of scans) {
    const g = gateOf(s)
    if (!byGate.has(g)) byGate.set(g, { ok: [], bad: [] })
    ;(s.outcome && SUCCESS.has(s.outcome) ? byGate.get(g)!.ok : byGate.get(g)!.bad).push(s)
  }

  const recentOk = ok.filter((s) => nowMs - time(s) <= RECENT_MS)
  const anyRecent = recentOk.length > 0
  const entrances: DoorEntrance[] = [...byGate.entries()]
    .map(([name, rows]) => {
      const recent = rows.ok.filter((s) => nowMs - time(s) <= RECENT_MS).length
      const last = rows.ok.reduce<number | null>((max, s) => (max === null || time(s) > max ? time(s) : max), null)
      return {
        name,
        entered: rows.ok.length,
        recent,
        perMinute: Math.round((recent / 15) * 10) / 10,
        problems: rows.bad.filter((s) => nowMs - time(s) <= PROBLEM_WINDOW_MS).length,
        lastScanAt: last === null ? null : new Date(last).toISOString(),
        stalled: anyRecent && (last === null || nowMs - last > STALL_MS),
      }
    })
    .sort((a, b) => Number(b.stalled) - Number(a.stalled) || b.problems - a.problems || b.entered - a.entered)

  const recentBad = bad.filter((s) => nowMs - time(s) <= PROBLEM_WINDOW_MS).sort((a, b) => time(b) - time(a))
  const counts = new Map<string, number>()
  for (const s of recentBad) {
    const label = problemCopy(s.outcome ?? "error").label
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  const entered = input.entered ?? ok.length
  const sold = input.sold ?? 0
  const lastScan = scans.reduce<number | null>((max, s) => (max === null || time(s) > max ? time(s) : max), null)

  return {
    sold,
    entered,
    enteredPct: sold > 0 ? Math.min(100, Math.round((entered / sold) * 100)) : null,
    perMinute: Math.round((recentOk.length / 15) * 10) / 10,
    lastScanAt: lastScan === null ? null : new Date(lastScan).toISOString(),
    entrances,
    scanners: devices
      .map((d) => ({ id: d.id, label: d.label?.trim() || "Unnamed scanner", state: scannerState(d.last_seen_at, nowMs), lastSeenAt: d.last_seen_at }))
      .sort((a, b) => ["offline", "quiet", "online"].indexOf(a.state) - ["offline", "quiet", "online"].indexOf(b.state)),
    problems: recentBad.slice(0, 20).map((s) => ({
      outcome: s.outcome ?? "error",
      ...problemCopy(s.outcome ?? "error"),
      gate: gateOf(s),
      at: s.scanned_at,
      codeHint: s.ticket_code ? s.ticket_code.slice(-4).toUpperCase() : null,
    })),
    problemCounts: [...counts.entries()].map(([label, count]) => ({ outcome: label, label, count })).sort((a, b) => b.count - a.count),
  }
}
