import { DEFAULT_EVENT_TIME_ZONE, eventTimeZone } from "@ticketiv/shared"

import { DoorLiveView } from "@/components/organizer/door-live-view"
import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { summariseDoor, type DoorDeviceRow, type DoorScanRow } from "@/lib/organizer/door-live"
import type { createServerSupabaseClient } from "@/lib/supabase-server"

type Supabase = NonNullable<ReturnType<typeof createServerSupabaseClient>>

/* Live and Scan history tabs of the Door page (managers only — the page checks
 * canManageEventIn before rendering these). Reads go through the manager's RLS. */

/** How far back the live view reads scans: long enough for a full door session. */
const SCAN_WINDOW_MS = 8 * 60 * 60 * 1000

/** The request time; each refresh renders the page again on the server. */
function readClock() {
  return Date.now()
}

export async function DoorLivePanel({
  supabase,
  orgId,
  eventId,
  eventTitle,
}: {
  supabase: Supabase
  orgId: string
  eventId: string
  eventTitle: string
}) {
  const nowMs = readClock()
  const since = new Date(nowMs - SCAN_WINDOW_MS).toISOString()
  // The live-stats view and device table are newer than some generated types.
  const db = supabase as any
  const [eventRes, statsRes, scansRes, devicesRes] = await Promise.all([
    db.from("events").select("tz, venues(tz)").eq("id", eventId).maybeSingle(),
    db.from("event_live_stats").select("tickets_sold, checked_in_count").eq("event_id", eventId).maybeSingle(),
    db
      .from("scans")
      .select("outcome, gate, device_id, scanned_at, ticket_code")
      .eq("event_id", eventId)
      .gte("scanned_at", since)
      .order("scanned_at", { ascending: false })
      .limit(10000),
    db.from("devices").select("id, label, last_seen_at").eq("event_id", eventId).limit(200),
  ])
  if (statsRes.error) console.error("[door-live] stats:", statsRes.error)
  if (scansRes.error) console.error("[door-live] scans:", scansRes.error)
  if (devicesRes.error) console.error("[door-live] devices:", devicesRes.error)

  const summary = summariseDoor({
    scans: (scansRes.data ?? []) as DoorScanRow[],
    devices: (devicesRes.data ?? []) as DoorDeviceRow[],
    sold: statsRes.data?.tickets_sold ?? null,
    entered: statsRes.data?.checked_in_count ?? null,
    nowMs,
  })

  return (
    <DoorLiveView
      embedded
      summary={summary}
      eventTitle={eventTitle}
      timeZone={eventTimeZone(eventRes.data?.tz, eventRes.data?.venues?.tz)}
      nowMs={nowMs}
      backHref={`/orgs/${orgId}/events/${eventId}/door`}
      scannerHref={`/orgs/${orgId}/events/${eventId}/scanner`}
    />
  )
}

interface Scan {
  id: string
  ticket_code: string
  scanned_at: string
  device_id: string | null
  outcome: string
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" }) {
  const color = tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-ink"
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
        <p className={`font-mono text-[22px] font-semibold tabular-nums ${color}`}>{value}</p>
      </CardBody>
    </Card>
  )
}

function outcomeChip(outcome: string) {
  if (outcome === "success") return <Chip size="sm" variant="active">success</Chip>
  if (outcome === "invalid") {
    return (
      <Chip size="sm" variant="muted" className="bg-danger-soft text-danger">
        invalid
      </Chip>
    )
  }
  return <Chip size="sm" variant="default">Already scanned</Chip>
}

export async function ScanHistoryPanel({
  supabase,
  orgId,
  eventId,
}: {
  supabase: Supabase
  orgId: string
  eventId: string
}) {
  const { data, error } = await supabase
    .from("scans")
    .select("id, ticket_code, scanned_at, device_id, outcome")
    .eq("event_id", eventId)
    .order("scanned_at", { ascending: false })
    .limit(100)
  if (error) console.error("[door-scans]", error)
  const scans = (data ?? []) as Scan[]
  const successful = scans.filter((s) => s.outcome === "success").length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-3">The latest 100 scans for this event.</p>
        <a href={`/api/orgs/${orgId}/events/${eventId}/attendees.csv`}>
          <Button variant="outline" size="sm">
            <Icon name="download" size={14} />
            Export CSV
          </Button>
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Total scans" value={scans.length} />
        <StatTile label="Successful" value={successful} tone="success" />
        <StatTile label="Failed" value={scans.length - successful} tone="danger" />
      </div>

      <Card>
        <CardBody className="px-5 py-4">
          <p className="text-label">Recent scans</p>
        </CardBody>
        <CardDivider />
        {scans.length === 0 ? (
          <CardBody className="flex flex-col items-center gap-3 px-5 py-12 text-center">
            <Icon name="qr" size={32} className="text-ink-4" />
            <p className="text-[13px] text-ink-3">No scans yet.</p>
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-label">Ticket</th>
                  <th className="px-5 py-3 text-left text-label">Scanned at</th>
                  <th className="px-5 py-3 text-left text-label">Device</th>
                  <th className="px-5 py-3 text-left text-label">Status</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan, i) => (
                  <tr key={scan.id} className={i > 0 ? "border-t border-line" : ""}>
                    <td className="px-5 py-3 font-mono text-[13px] text-ink">{scan.ticket_code}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-ink-3">
                      {new Date(scan.scanned_at).toLocaleString("en-SZ", {
                        timeZone: DEFAULT_EVENT_TIME_ZONE,
                        dateStyle: "medium",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-5 py-3 text-[13px] text-ink-3">{scan.device_id ?? "—"}</td>
                    <td className="px-5 py-3">{outcomeChip(scan.outcome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
