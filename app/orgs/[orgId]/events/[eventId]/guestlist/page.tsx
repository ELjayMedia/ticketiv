import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoEventById } from "@/lib/demo-data"
import { ArrowLeft, Plus, Download, CheckCircle, Trash2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function GuestlistPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null
  let guestlistEntries: any[] = []

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) {
        return redirect("/403")
      }
      // Demo guestlist entries
      guestlistEntries = [
        { id: "1", name: "John Doe", email: "john@example.com", status: "fulfilled", created_at: "2024-01-15" },
        { id: "2", name: "Jane Smith", email: "jane@example.com", status: "pending", created_at: "2024-01-14" },
        { id: "3", name: "Bob Johnson", email: "bob@example.com", status: "fulfilled", created_at: "2024-01-13" },
      ]
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

    // Fetch guestlist entries
    const { data: entries = [] } = await supabase
      .from("guestlist_entries")
      .select("id, name, email, status, created_at")
      .eq("event_id", eventId)

    guestlistEntries = entries
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
              <h1 className="text-3xl font-bold text-foreground">Guestlist</h1>
              <p className="text-muted-foreground mt-1">{event?.title}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Guests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{guestlistEntries.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Fulfilled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {guestlistEntries.filter((g) => g.status === "fulfilled").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {guestlistEntries.filter((g) => g.status === "pending").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guestlist Table */}
        <Card>
          <CardHeader>
            <CardTitle>Guests</CardTitle>
          </CardHeader>
          <CardContent>
            {guestlistEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No guests yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guestlistEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.name}</TableCell>
                        <TableCell>{entry.email}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === "fulfilled" ? "default" : "outline"}>
                            {entry.status === "fulfilled" ? (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            ) : null}
                            {entry.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.created_at}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            {entry.status === "pending" ? "Fulfill" : "Unfulfill"}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
