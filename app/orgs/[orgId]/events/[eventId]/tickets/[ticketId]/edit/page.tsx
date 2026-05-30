import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import { Icon } from "@/components/quiet/ui/icon"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { TicketTypeForm } from "../../_components/ticket-type-form"

export default async function EditTicketTypePage({
  params,
}: {
  params: { orgId: string; eventId: string; ticketId: string }
}) {
  const { orgId, eventId, ticketId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  type TicketTypeRow = { id: string; name: string; price_cents: number; quota: number; per_user_limit: number | null }
  let ticketType: TicketTypeRow | null = null

  if (demoSessionCookie) {
    // Demo fallback — synthetic data matching the demo ticket types
    const demoTypes: Record<string, TicketTypeRow> = {
      general: { id: "general", name: "General Admission", price_cents: 12900, quota: 100, per_user_limit: 5 },
      vip: { id: "vip", name: "VIP", price_cents: 29900, quota: 20, per_user_limit: 2 },
    }
    ticketType = demoTypes[ticketId] ?? null
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) return redirect("/login")

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return redirect("/login")

    const { data } = await supabase
      .from("ticket_types")
      .select("id, name, price_cents, quota, per_user_limit")
      .eq("id", ticketId)
      .eq("event_id", eventId)
      .maybeSingle()

    ticketType = data ?? null
  }

  if (!ticketType) return redirect(`/orgs/${orgId}/events/${eventId}/tickets`)

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}/tickets`}
            aria-label="Back to ticket types"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <h1 className="text-h1">Edit ticket type</h1>
        </div>

        <TicketTypeForm
          orgId={orgId}
          eventId={eventId}
          ticketTypeId={ticketId}
          defaultValues={ticketType}
        />
      </div>
    </main>
  )
}
