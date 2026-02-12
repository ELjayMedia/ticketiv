import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cookies } from "next/headers"
import { getDemoEventById } from "@/lib/demo-data"
import { EventManagementTabs } from "@/components/event-management-tabs"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface EventDetailPageProps {
  params: {
    orgId: string
    eventId: string
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
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
      return redirect("/403")
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

    const { data: eventData, error } = await supabase
      .from("events")
      .select("id, title, date, status, cover_image_url, description")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .maybeSingle()

    if (error || !eventData) {
      console.error("[v0] Error fetching event:", error)
      return redirect("/403")
    }

    event = eventData
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with back button */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Button variant="ghost" asChild className="mb-4 -ml-2">
              <Link href={`/orgs/${orgId}/events`} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Events
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{event.title}</h1>
              <p className="text-muted-foreground mt-1">{event.description}</p>
            </div>
          </div>
        </div>

        {/* Event Image Preview */}
        {event.cover_image_url && (
          <Card className="overflow-hidden">
            <div className="w-full h-64 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          </Card>
        )}

        {/* Management Tabs */}
        <EventManagementTabs eventId={eventId} orgId={orgId} event={event} />
      </div>
    </main>
  )
}
