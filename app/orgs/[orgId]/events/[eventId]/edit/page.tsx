import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getDemoEventById } from "@/lib/demo-data"
import EventWizardClient from "./EventWizardClient"

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
        org_id
      `)
      .eq("id", eventId)
      .eq("org_id", orgId)
      .maybeSingle()

    if (!eventData) {
      return redirect("/403")
    }

    event = eventData
  }

  // Render client wizard component
  return <EventWizardClient orgId={orgId} eventId={eventId} initialEvent={event} />
}
