import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoEventById } from "@/lib/demo-data"
import { ArrowLeft, Download, QrCode } from "lucide-react"

export const dynamic = "force-dynamic"

interface Scan {
  id: string
  ticket_id: string
  scanned_at: string
  scanned_by: string
  status: "success" | "invalid" | "already_scanned"
}

export default async function ScansPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null
  let scans: Scan[] = []
  let totalScans = 0
  let successfulScans = 0
  let failedScans = 0

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) {
        return redirect("/403")
      }
      // Demo scan data
      scans = [
        { id: "1", ticket_id: "TK001", scanned_at: "2024-01-15 19:30:45", scanned_by: "Scanner1", status: "success" },
        { id: "2", ticket_id: "TK002", scanned_at: "2024-01-15 19:31:12", scanned_by: "Scanner1", status: "success" },
        { id: "3", ticket_id: "TK003", scanned_at: "2024-01-15 19:32:05", scanned_by: "Scanner2", status: "already_scanned" },
        { id: "4", ticket_id: "INVALID", scanned_at: "2024-01-15 19:33:20", scanned_by: "Scanner2", status: "invalid" },
      ]
      totalScans = scans.length
      successfulScans = scans.filter((s) => s.status === "success").length
      failedScans = scans.filter((s) => s.status !== "success").length
    } catch (error) {
      console.error("[v0] Failed to load demo data:", error)
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return redirect("/login")
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return redirect("/login")
    }

    // Fetch event
    const { data: eventData } = await supabase
      .from("events")
      .select("id, title")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .maybeSingle()

    if (!eventData) {
      return redirect("/403")
    }

    event = eventData

    // Fetch scan history
    const { data: scansData = [] } = await supabase
      .from("scans")
      .select("id, ticket_id, scanned_at, scanned_by, status")
      .eq("event_id", eventId)
      .order("scanned_at", { ascending: false })
      .limit(100)

    scans = scansData as Scan[]
    totalScans = scans.length
    successfulScans = scans.filter((s) => s.status === "success").length
    failedScans = scans.filter((s) => s.status !== "success").length
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/orgs/${orgId}/events/${eventId}/edit`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Scan History</h1>
              <p className="text-muted-foreground mt-1">{event?.title}</p>
            </div>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalScans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Successful</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{successfulScans}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{failedScans}</div>
            </CardContent>
          </Card>
        </div>

        {/* Scans Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>Latest scan activity for this event</CardDescription>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">No scans yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Scanned At</TableHead>
                      <TableHead>Scanned By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scans.map((scan) => (
                      <TableRow key={scan.id}>
                        <TableCell className="font-mono text-sm">{scan.ticket_id}</TableCell>
                        <TableCell>{scan.scanned_at}</TableCell>
                        <TableCell>{scan.scanned_by}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              scan.status === "success"
                                ? "default"
                                : scan.status === "invalid"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {scan.status === "already_scanned" ? "Already Scanned" : scan.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
