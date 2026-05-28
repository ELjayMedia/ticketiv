import Link from "next/link"
import { redirect } from "next/navigation"

import { Icon } from "@/components/quiet/ui/icon"
import { GuestlistTab } from "@/components/event-management/guestlist-tab"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function GuestlistPage({
  params,
}: {
  params: Promise<{ orgId: string; eventId: string }>
}) {
  const { orgId, eventId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()

  if (!event) return redirect("/403")

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}/edit`}
            aria-label="Back to event"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Guestlist</h1>
            <p className="text-[13px] text-ink-3">{event.title}</p>
          </div>
        </div>

        <GuestlistTab eventId={eventId} />
      </div>
    </main>
  )
}
