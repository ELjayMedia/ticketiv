import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { EventStaffClient, type StaffMember } from "./staff-client"
import { DevicesClient, type DeviceRow } from "./devices-client"

export const dynamic = "force-dynamic"

// TICK-56 — Staff + device & scanner assignment management

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

export default async function EventStaffPage({ params }: { params: Promise<{ orgId: string; eventId: string }> }) {
  const { orgId, eventId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) redirect("/403")

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()
  const canManage = Boolean(member?.role && MANAGER_ROLES.has(String(member.role)))

  const admin = createAdminClient()

  // Load event staff + devices in parallel
  const [staffRes, devicesRes] = await Promise.all([
    admin
      .from("event_staff")
      .select("user_id, role, active, created_at")
      .eq("event_id", eventId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("devices")
      .select("id, label, device_role, max_scans_per_minute, last_seen_at, created_at")
      .eq("event_id", eventId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
  ])

  const initialStaff: StaffMember[] = await Promise.all(
    (staffRes.data ?? []).map(async (row) => {
      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id)
      return {
        user_id: row.user_id,
        role: String(row.role),
        email: authUser?.user?.email ?? null,
      }
    }),
  )

  const initialDevices: DeviceRow[] = (devicesRes.data ?? []).map((d) => ({
    id: d.id,
    label: d.label ?? "",
    device_role: d.device_role,
    max_scans_per_minute: d.max_scans_per_minute ?? null,
    last_seen_at: d.last_seen_at ?? null,
  }))

  // Active/recent device sessions for this event's devices (AC: gate staff
  // visibility). A session is "active" while ended_at is null.
  const deviceLabelById = new Map((devicesRes.data ?? []).map((d) => [d.id, d.label ?? "Device"]))
  const deviceIds = (devicesRes.data ?? []).map((d) => d.id)
  type SessionRow = {
    id: string
    deviceLabel: string
    userEmail: string | null
    startedAt: string | null
    endedAt: string | null
  }
  let sessions: SessionRow[] = []
  if (deviceIds.length > 0) {
    const { data: sessionRows } = await admin
      .from("device_sessions")
      .select("id, device_id, user_id, started_at, ended_at")
      .in("device_id", deviceIds)
      .order("started_at", { ascending: false })
      .limit(20)

    const userIds = Array.from(
      new Set((sessionRows ?? []).map((s) => s.user_id).filter((userId): userId is string => Boolean(userId))),
    )
    const emailById = new Map<string, string | null>()
    await Promise.all(
      userIds.map(async (uid) => {
        const { data: authUser } = await admin.auth.admin.getUserById(uid)
        emailById.set(uid, authUser?.user?.email ?? null)
      }),
    )

    sessions = (sessionRows ?? []).map((s) => ({
      id: s.id,
      deviceLabel: deviceLabelById.get(s.device_id) ?? "Device",
      userEmail: s.user_id ? emailById.get(s.user_id) ?? null : null,
      startedAt: s.started_at,
      endedAt: s.ended_at,
    }))
  }

  const fmtSession = (value: string | null) =>
    value ? new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}`}
            aria-label="Back to event"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Staff & devices</h1>
            <p className="text-[13px] text-ink-3">{event.title}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2">Event staff</h2>
              <p className="text-[13px] text-ink-3">
                Assign staff roles — scanners, event admins and general staff. Assigned users see this event in their scanner picker.
              </p>
            </div>
            <EventStaffClient eventId={eventId} canManage={canManage} initialStaff={initialStaff} />
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2">Devices</h2>
              <p className="text-[13px] text-ink-3">
                Register and label devices for gate scanning. A registered device produces a usable scanner setup for this event.
              </p>
            </div>
            <DevicesClient
              orgId={orgId}
              eventId={eventId}
              canManage={canManage}
              initialDevices={initialDevices}
            />
          </section>
        </div>

        {/* Device sessions — who has scanned on which device, and which
            sessions are still open. */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h2">Device sessions</h2>
            <p className="text-[13px] text-ink-3">
              Active and recent gate scanning sessions across this event&apos;s devices.
            </p>
          </div>
          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">Recent sessions{sessions.length ? ` (${sessions.length})` : ""}</p>
            </CardBody>
            <CardDivider />
            {sessions.length === 0 ? (
              <CardBody className="py-10 text-center text-[13px] text-ink-3">
                No device sessions yet. Sessions appear once staff start scanning on a registered device.
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Device</th>
                      <th className="px-5 py-3 text-left text-label">Operator</th>
                      <th className="px-5 py-3 text-left text-label">Started</th>
                      <th className="px-5 py-3 text-left text-label">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((s, i) => (
                      <tr key={s.id} className={i > 0 ? "border-t border-line" : ""}>
                        <td className="px-5 py-3 text-[13px] font-semibold text-ink">{s.deviceLabel}</td>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{s.userEmail ?? "—"}</td>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3">{fmtSession(s.startedAt)}</td>
                        <td className="px-5 py-3">
                          {s.endedAt ? (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                              Ended {fmtSession(s.endedAt)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
                              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Active
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>
    </main>
  )
}
