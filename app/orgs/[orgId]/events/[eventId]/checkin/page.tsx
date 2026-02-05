import React from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { loadUserPermissions } from "@/lib/permissions-loader"
import { PERMISSION_ACTIONS, hasPermission, canScanEvent } from "@/lib/rbac"
import { redirect } from "next/navigation"
import { CheckinScanner } from "@/components/checkin-scanner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const dynamic = "force-dynamic"

interface CheckinPageProps {
  params: {
    orgId: string
    eventId: string
  }
}

export default async function EventCheckinPage({ params }: CheckinPageProps) {
  const { orgId, eventId } = params

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

  // Load user permissions
  const userAuthz = await loadUserPermissions(session.user.id)
  if (!userAuthz) {
    return redirect("/login")
  }

  // Check EVENT_SCAN permission
  if (!canScanEvent(userAuthz.permissions, eventId)) {
    return redirect("/403")
  }

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()

  if (eventError || !event) {
    return redirect("/403")
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/orgs/${orgId}/events/${eventId}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to event</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{event.title}</h1>
            <p className="text-muted-foreground mt-1">Check-in attendees by scanning QR codes</p>
          </div>
        </div>

        {/* Check-in Scanner */}
        <CheckinScanner />
      </div>
    </main>
  )
}
