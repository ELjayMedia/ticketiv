import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoEventById } from "@/lib/demo-data"
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function EventEditPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let event: any = null

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(eventId)
      if (!event) {
        return redirect("/403")
      }
    } catch (error) {
      console.error("[v0] Failed to load demo event:", error)
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

    const { data: eventData } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        date,
        status,
        venue_id,
        venue:venues(name, address, city),
        capacity,
        ticket_count
      `)
      .eq("id", eventId)
      .eq("org_id", orgId)
      .maybeSingle()

    if (!eventData) {
      return redirect("/403")
    }

    event = eventData
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/orgs/${orgId}/events`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Event</h1>
            <p className="text-muted-foreground mt-1">{event?.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Event Title</Label>
                  <Input id="title" defaultValue={event?.title} placeholder="Enter event title" />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" defaultValue={event?.description} placeholder="Event details..." rows={4} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date & Time</Label>
                    <Input id="date" type="datetime-local" defaultValue={event?.date} />
                  </div>
                  <div>
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" type="number" defaultValue={event?.capacity} placeholder="0" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Venue */}
            <Card>
              <CardHeader>
                <CardTitle>Venue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="venue">Venue Name</Label>
                  <Input id="venue" defaultValue={event?.venue?.name} placeholder="Select or create venue..." />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" defaultValue={event?.venue?.address} placeholder="Street address..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" defaultValue={event?.venue?.city} placeholder="City..." />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" placeholder="Country..." />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cover">Cover Image</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <p className="text-muted-foreground">Drag and drop or click to upload</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                  {event?.status || "draft"}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Event Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Attendees:</span> {event?.capacity || 0}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Date:</span> {event?.date}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              <Button className="w-full">Save Changes</Button>
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href={`/orgs/${orgId}/events`}>Cancel</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
