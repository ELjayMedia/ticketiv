import { eventTimeZone } from "@ticketiv/shared"
import { redirect } from "next/navigation"

import { DoorLiveView } from "@/components/organizer/door-live-view"
import { requireEventManager } from "@/lib/organizer/access"
import { summariseDoor, type DoorDeviceRow, type DoorScanRow } from "@/lib/organizer/door-live"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const metadata = { title: "Door live" }

/** How far back the view reads scans: long enough for a full door session. */
const SCAN_WINDOW_MS = 8 * 60 * 60 * 1000

/** The request time; each refresh renders this page again on the server. */
function readClock() {
  return Date.now()
}

/**
 * Door-day live view for event managers: sold vs entered, entry pace, each
 * entrance, scanner health and scan problems. Reads the scans, devices and
 * live stats the door already records, through the manager's own RLS.
 */
export default async function DoorLivePage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params
  await requireEventManager(orgId, eventId)

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const nowMs = readClock()
  const since = new Date(nowMs - SCAN_WINDOW_MS).toISOString()
  // The live-stats view and device table are newer than some generated types.
  const db = supabase as any
  const [eventRes, statsRes, scansRes, devicesRes] = await Promise.all([
    db.from("events").select("id, title, org_id, tz, venues(tz)").eq("id", eventId).maybeSingle(),
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
  if (!eventRes.data || eventRes.data.org_id !== orgId) redirect("/403")
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
      summary={summary}
      eventTitle={String(eventRes.data.title ?? "Event")}
      timeZone={eventTimeZone(eventRes.data.tz, eventRes.data.venues?.tz)}
      nowMs={nowMs}
      backHref={`/orgs/${orgId}/events/${eventId}`}
      scannerHref={`/orgs/${orgId}/events/${eventId}/scanner`}
    />
  )
}
