import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoEventById } from "@/lib/demo-data"
import { ArrowLeft, Plus, Trash2, DollarSign, Users } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function TicketsPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null
  let ticketTypes: any[] = []

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) {
        return redirect("/403")
      }
      // Demo ticket types
      ticketTypes = [
        { id: "general", name: "General Admission", price_cents: 12900, quota: 100, per_user_limit: 5 },
        { id: "vip", name: "VIP", price_cents: 29900, quota: 20, per_user_limit: 2 },
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

    // Fetch ticket types
    const { data: types = [] } = await supabase
      .from("ticket_types")
      .select("id, name, price_cents, quota, per_user_limit")
      .eq("event_id", eventId)

    ticketTypes = types
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
              <h1 className="text-3xl font-bold text-foreground">Ticket Types</h1>
              <p className="text-muted-foreground mt-1">{event?.title}</p>
            </div>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Ticket Type
          </Button>
        </div>

        {/* Ticket Types List */}
        <div className="space-y-4">
          {ticketTypes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No ticket types yet</p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Ticket Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            ticketTypes.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{ticket.name}</CardTitle>
                      <CardDescription>ID: {ticket.id}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive bg-transparent">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Price</Label>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">${(ticket.price_cents / 100).toFixed(2)}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Quota</Label>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{ticket.quota}</span>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Per User Limit</Label>
                      <span className="font-semibold">{ticket.per_user_limit}</span>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Badge>Active</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  )
}
