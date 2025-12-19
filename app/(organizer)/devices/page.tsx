import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Smartphone, WifiOff, Wifi, Clock, Ban, CheckCircle2, Activity } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DevicesPage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return <div className="p-4 text-center">Supabase not configured</div>
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

  // Fetch all devices used by this org's events
  const { data: devices = [] } = await supabase
    .from("devices")
    .select(
      `
      *,
      device_sessions!inner(event_id, events!inner(org_id))
    `,
    )
    .eq("device_sessions.events.org_id", orgMember.org_id)
    .order("last_seen_at", { ascending: false })

  // Fetch device sessions with scan counts
  const { data: sessions = [] } = await supabase
    .from("device_sessions")
    .select(
      `
      *,
      event:events!inner(id, title, org_id),
      device:devices(id, name, active),
      scans(count)
    `,
    )
    .eq("event.org_id", orgMember.org_id)
    .order("started_at", { ascending: false })
    .limit(20)

  // Calculate device stats
  const deviceStats = await Promise.all(
    devices.map(async (device: any) => {
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

      const isOnline = device.last_seen_at && new Date(device.last_seen_at).getTime() > Date.now() - 5 * 60 * 1000 // 5 minutes

      return {
        ...device,
        totalScans: totalScans || 0,
        todayScans: todayScans || 0,
        latestSession,
        isOnline,
      }
    }),
  )

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-background pb-6">
        <div className="space-y-4 p-4">
          <div>
            <h1 className="text-2xl font-bold">Devices</h1>
            <p className="text-sm text-muted-foreground">Manage scanner devices</p>
          </div>

          {/* Mobile Device Cards */}
          <div className="space-y-3">
            {deviceStats.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No scanner devices yet
                </CardContent>
              </Card>
            ) : (
              deviceStats.map((device: any) => (
                <Card key={device.id} className={device.active ? "" : "opacity-60"}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          <Smartphone className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{device.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{device.id.slice(0, 12)}</p>
                        </div>
                      </div>
                      <Badge variant={device.isOnline ? "default" : "secondary"} className="flex items-center gap-1">
                        {device.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                        {device.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Today</p>
                        <p className="text-lg font-bold">{device.todayScans}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Scans</p>
                        <p className="text-lg font-bold">{device.totalScans}</p>
                      </div>
                    </div>

                    {device.latestSession && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground">Latest Session</p>
                        <p className="text-sm font-medium truncate">{device.latestSession.event?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(device.latestSession.started_at).toLocaleString()}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                        View Stats
                      </Button>
                      {device.active ? (
                        <Button size="sm" variant="ghost">
                          <Ban className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Activate
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Mobile Recent Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
              ) : (
                sessions.slice(0, 5).map((session: any) => (
                  <div key={session.id} className="pb-3 border-b last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{session.device?.name}</p>
                        <p className="text-xs text-muted-foreground">{session.event?.title}</p>
                      </div>
                      <Badge variant={session.status === "active" ? "default" : "secondary"}>{session.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{new Date(session.started_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{session.scans?.[0]?.count || 0} scans</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Device Management</h1>
              <p className="text-muted-foreground">Monitor and manage scanner devices across your events</p>
            </div>
          </div>

          {/* Desktop Device Stats Grid */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
                <Smartphone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{deviceStats.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {deviceStats.filter((d: any) => d.active).length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Online Now</CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{deviceStats.filter((d: any) => d.isOnline).length}</p>
                <p className="text-xs text-muted-foreground mt-1">Connected devices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Scans Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {deviceStats.reduce((sum: number, d: any) => sum + d.todayScans, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Across all devices</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Scans</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {deviceStats.reduce((sum: number, d: any) => sum + d.totalScans, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Devices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Devices</CardTitle>
              <CardDescription>Monitor device status, activity, and manage access</CardDescription>
            </CardHeader>
            <CardContent>
              {deviceStats.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No scanner devices registered yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Today</TableHead>
                      <TableHead>Total Scans</TableHead>
                      <TableHead>Latest Event</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deviceStats.map((device: any) => (
                      <TableRow key={device.id} className={!device.active ? "opacity-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Smartphone className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">{device.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{device.id.slice(0, 16)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={device.isOnline ? "default" : "secondary"}
                            className="flex items-center gap-1 w-fit"
                          >
                            {device.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                            {device.isOnline ? "Online" : "Offline"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {device.last_seen_at
                              ? new Date(device.last_seen_at).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Never"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{device.todayScans}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{device.totalScans}</p>
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {device.latestSession?.event?.title || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              Stats
                            </Button>
                            {device.active ? (
                              <Button size="sm" variant="ghost">
                                Revoke
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost">
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Desktop Sessions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Track scanner sessions and activity history</CardDescription>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">No scanner sessions yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Scans</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session: any) => {
                      const duration = session.ended_at
                        ? Math.round(
                            (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000 / 60,
                          )
                        : null

                      return (
                        <TableRow key={session.id}>
                          <TableCell className="font-medium text-sm">
                            {session.device?.name || session.device_id}
                          </TableCell>
                          <TableCell className="text-sm">{session.event?.title}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(session.started_at).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {duration ? `${duration} min` : "Active"}
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold">{session.scans?.[0]?.count || 0}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.status === "active" ? "default" : "secondary"}>
                              {session.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
