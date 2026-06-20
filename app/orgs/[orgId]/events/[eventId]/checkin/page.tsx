import { redirect } from "next/navigation"
import Link from "next/link"

import { CheckinScanner } from "@/components/checkin-scanner"
import { Icon } from "@/components/quiet/ui/icon"
import { loadUserPermissions } from "@/lib/permissions-loader"
import { canScanEvent } from "@/lib/rbac"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

interface CheckinPageProps {
  params: Promise<{
    orgId: string
    eventId: string
  }>
}

export default async function EventCheckinPage({ params }: CheckinPageProps) {
  const { orgId, eventId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return redirect("/login")

  const userAuthz = await loadUserPermissions(session.user.id)
  if (!userAuthz) return redirect("/login")
  if (!canScanEvent(userAuthz.permissions, eventId)) return redirect("/403")

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()

  if (eventError || !event) return redirect("/403")

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}`}
            aria-label="Back to event"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">{event.title}</h1>
            <p className="text-[13px] text-ink-3">Check-in attendees by scanning QR codes.</p>
          </div>
        </div>

        <CheckinScanner />
      </div>
    </main>
  )
}
