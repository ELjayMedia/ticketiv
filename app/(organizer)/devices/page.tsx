import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"

export const dynamic = "force-dynamic"

function KpiCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: number | string
  sub: string
  icon: IconName
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-5">
        <div className="flex items-center justify-between">
          <span className="text-label">{label}</span>
          <Icon name={icon} size={14} className="text-ink-3" />
        </div>
        <p className="font-mono text-[24px] font-semibold tabular-nums text-ink">{value}</p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{sub}</p>
      </CardBody>
    </Card>
  )
}

function OnlineChip({ online }: { online: boolean }) {
  return (
    <Chip size="sm" variant={online ? "active" : "muted"}>
      <Icon name="globe" size={12} />
      {online ? "Online" : "Offline"}
    </Chip>
  )
}

export default async function DevicesPage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 text-[13px] text-ink-3">
        Supabase not configured
      </main>
    )
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: orgMember } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", session.user.id)
    .single()

  if (!orgMember) redirect("/app")

  const { data: devices = [] } = await supabase
    .from("devices")
    .select(`
      *,
      device_sessions!inner(event_id, events!inner(org_id))
    `)
    .eq("device_sessions.events.org_id", orgMember.org_id)
    .order("last_seen_at", { ascending: false })

  const { data: sessions = [] } = await supabase
    .from("device_sessions")
    .select(`
      *,
      event:events!inner(id, title, org_id),
      device:devices(id, name, active),
      scans(count)
    `)
    .eq("event.org_id", orgMember.org_id)
    .order("started_at", { ascending: false })
    .limit(20)

  const deviceList = devices ?? []
  const sessionList = sessions ?? []

  const deviceStats = await Promise.all(
    deviceList.map(async (device: any) => {
      const { count: totalScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("device_id", device.id)

      const { count: todayScans } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("device_id", device.id)
        .gte("scanned_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())

      const { data: latestSession } = await supabase
        .from("device_sessions")
        .select("started_at, ended_at, status, event:events(title)")
        .eq("device_id", device.id)
        .order("started_at", { ascending: false })
        .limit(1)
        .single()

      const isOnline =
        device.last_seen_at && new Date(device.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000

      return {
        ...device,
        totalScans: totalScans || 0,
        todayScans: todayScans || 0,
        latestSession,
        isOnline,
      }
    }),
  )

  const totalDevices = deviceStats.length
  const activeCount = deviceStats.filter((d: any) => d.active).length
  const onlineCount = deviceStats.filter((d: any) => d.isOnline).length
  const todayTotal = deviceStats.reduce((sum: number, d: any) => sum + d.todayScans, 0)
  const allTimeTotal = deviceStats.reduce((sum: number, d: any) => sum + d.totalScans, 0)

  return (
    <>
      {/* Mobile */}
      <div className="min-h-dvh pb-6 lg:hidden">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Devices</h1>
            <p className="text-[13px] text-ink-3">Manage scanner devices.</p>
          </div>

          <div className="flex flex-col gap-3">
            {deviceStats.length === 0 ? (
              <Card>
                <CardBody className="py-12 text-center text-[13px] text-ink-3">
                  No scanner devices yet.
                </CardBody>
              </Card>
            ) : (
              deviceStats.map((device: any) => (
                <Card key={device.id} className={device.active ? "" : "opacity-60"}>
                  <CardBody className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Icon name="ticket" size={18} className="mt-0.5 text-ink-3" />
                        <div className="flex flex-col gap-0.5">
                          <p className="text-[14px] font-semibold text-ink">{device.name}</p>
                          <p className="font-mono text-[11px] text-ink-3">{device.id.slice(0, 12)}</p>
                        </div>
                      </div>
                      <OnlineChip online={device.isOnline} />
                    </div>

                    <CardDivider />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Today</p>
                        <p className="font-mono text-[18px] font-semibold tabular-nums text-ink">
                          {device.todayScans}
                        </p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Total scans</p>
                        <p className="font-mono text-[18px] font-semibold tabular-nums text-ink">
                          {device.totalScans}
                        </p>
                      </div>
                    </div>

                    {device.latestSession && (
                      <>
                        <CardDivider />
                        <div className="flex flex-col gap-1">
                          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                            Latest session
                          </p>
                          <p className="truncate text-[13px] font-semibold text-ink">
                            {device.latestSession.event?.title}
                          </p>
                          <p className="font-mono text-[11px] text-ink-3">
                            {new Date(device.latestSession.started_at).toLocaleString()}
                          </p>
                        </div>
                      </>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="flex-1">
                        View stats
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Icon name={device.active ? "close" : "check"} size={14} />
                        {device.active ? "Revoke" : "Activate"}
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))
            )}
          </div>

          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-h3">Recent sessions</p>
            </CardBody>
            <CardDivider />
            <CardBody className="flex flex-col gap-3">
              {sessionList.length === 0 ? (
                <p className="py-4 text-center text-[13px] text-ink-3">No sessions yet.</p>
              ) : (
                sessionList.slice(0, 5).map((session: any, i: number) => (
                  <div key={session.id} className={i > 0 ? "border-t border-line pt-3" : ""}>
                    <div className="mb-1 flex items-start justify-between">
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[13px] font-semibold text-ink">{session.device?.name}</p>
                        <p className="text-[12px] text-ink-3">{session.event?.title}</p>
                      </div>
                      <Chip size="sm" variant={session.status === "active" ? "active" : "muted"}>
                        {session.status}
                      </Chip>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      <span>{new Date(session.started_at).toLocaleDateString()}</span>
                      <span>·</span>
                      <span>{session.scans?.[0]?.count || 0} scans</span>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden min-h-dvh lg:block">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1">Device management</h1>
              <p className="text-[13px] text-ink-3">
                Monitor and manage scanner devices across your events.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <KpiCard label="Total devices" value={totalDevices} sub={`${activeCount} active`} icon="ticket" />
            <KpiCard label="Online now" value={onlineCount} sub="Connected devices" icon="globe" />
            <KpiCard label="Scans today" value={todayTotal} sub="Across all devices" icon="trending" />
            <KpiCard label="Total scans" value={allTimeTotal} sub="All time" icon="check" />
          </div>

          <Card>
            <CardBody className="flex flex-col gap-1 px-5 py-4">
              <p className="text-h3">Active devices</p>
              <p className="text-[12px] text-ink-3">Monitor device status, activity, and manage access.</p>
            </CardBody>
            <CardDivider />
            {deviceStats.length === 0 ? (
              <CardBody className="py-12 text-center text-[13px] text-ink-3">
                No scanner devices registered yet.
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Device</th>
                      <th className="px-5 py-3 text-left text-label">Status</th>
                      <th className="px-5 py-3 text-left text-label">Last seen</th>
                      <th className="px-5 py-3 text-left text-label">Today</th>
                      <th className="px-5 py-3 text-left text-label">Total scans</th>
                      <th className="px-5 py-3 text-left text-label">Latest event</th>
                      <th className="px-5 py-3 text-left text-label">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviceStats.map((device: any, i: number) => (
                      <tr
                        key={device.id}
                        className={`${i > 0 ? "border-t border-line" : ""} ${!device.active ? "opacity-50" : ""}`}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Icon name="ticket" size={16} className="text-ink-3" />
                            <div className="flex flex-col gap-0.5">
                              <p className="text-[13px] font-semibold text-ink">{device.name}</p>
                              <p className="font-mono text-[11px] text-ink-3">{device.id.slice(0, 16)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <OnlineChip online={device.isOnline} />
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-3">
                            <Icon name="clock" size={12} />
                            {device.last_seen_at
                              ? new Date(device.last_seen_at).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Never"}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[13px] font-semibold tabular-nums text-ink">
                          {device.todayScans}
                        </td>
                        <td className="px-5 py-3 font-mono text-[13px] font-semibold tabular-nums text-ink">
                          {device.totalScans}
                        </td>
                        <td className="max-w-xs truncate px-5 py-3 text-[13px] text-ink-3">
                          {device.latestSession?.event?.title || "—"}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">Stats</Button>
                            <Button size="sm" variant="ghost">
                              {device.active ? "Revoke" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-1 px-5 py-4">
              <p className="text-h3">Recent sessions</p>
              <p className="text-[12px] text-ink-3">Track scanner sessions and activity history.</p>
            </CardBody>
            <CardDivider />
            {sessionList.length === 0 ? (
              <CardBody className="py-12 text-center text-[13px] text-ink-3">
                No scanner sessions yet.
              </CardBody>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Device</th>
                      <th className="px-5 py-3 text-left text-label">Event</th>
                      <th className="px-5 py-3 text-left text-label">Started</th>
                      <th className="px-5 py-3 text-left text-label">Duration</th>
                      <th className="px-5 py-3 text-left text-label">Scans</th>
                      <th className="px-5 py-3 text-left text-label">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionList.map((session: any, i: number) => {
                      const duration = session.ended_at
                        ? Math.round(
                            (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000 / 60,
                          )
                        : null

                      return (
                        <tr key={session.id} className={i > 0 ? "border-t border-line" : ""}>
                          <td className="px-5 py-3 text-[13px] font-semibold text-ink">
                            {session.device?.name || session.device_id}
                          </td>
                          <td className="px-5 py-3 text-[13px] text-ink">{session.event?.title}</td>
                          <td className="px-5 py-3 font-mono text-[12px] text-ink-3">
                            {new Date(session.started_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-5 py-3 text-[13px] text-ink-3">
                            {duration ? `${duration} min` : "Active"}
                          </td>
                          <td className="px-5 py-3 font-mono text-[13px] font-semibold tabular-nums text-ink">
                            {session.scans?.[0]?.count || 0}
                          </td>
                          <td className="px-5 py-3">
                            <Chip size="sm" variant={session.status === "active" ? "active" : "muted"}>
                              {session.status}
                            </Chip>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}
