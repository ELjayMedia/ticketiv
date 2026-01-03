import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoEventById } from "@/lib/demo-data"
import { redirect, notFound } from "next/navigation"
import { cookies } from "next/headers"
import { CreateTicketTypeForm } from "@/components/tickets/create-ticket-type-form"

export const dynamic = "force-dynamic"

export default async function CreateTicketTypePage({ params }: { params: { eventId: string } }) {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")
  let event: any = null

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(params.eventId)
    } catch (error) {
      console.error("[v0] Failed to load demo event:", error)
    }
  } else {
    const supabase = createServerSupabaseClient()

    if (!supabase) {
      redirect("/login")
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) redirect("/login")

    const { data: eventData } = await supabase
      .from("events")
      .select(`
        *,
        venue:venues(name, city)
      `)
      .eq("id", params.eventId)
      .single()

    event = eventData

    // Verify user owns this event's organization
    if (event) {
      const { data: orgMember } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", session.user.id)
        .eq("org_id", event.org_id)
        .single()

      if (!orgMember) {
        notFound()
      }
    }
  }

  if (!event) notFound()

  return <CreateTicketTypeForm event={event} />
}
