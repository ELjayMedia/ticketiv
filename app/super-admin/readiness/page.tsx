import Link from "next/link"
import { ArrowLeft, CheckCircle2, Download, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

type ReadinessRow = {
  event_id: string
  org_id: string | null
  title: string | null
  status: string | null
  visibility: string | null
  starts_at: string | null
  ends_at: string | null
  on_sale_ticket_types: number | null
  has_active_pricing_plan: boolean | null
  has_payout_account: boolean | null
  checks: Record<string, boolean>
}

const CHECK_LABELS: Record<string, string> = {
  has_organization: "Organization assigned",
  has_venue: "Venue assigned",
  has_title: "Title added",
  has_slug: "Slug added",
  has_start_date: "Start date added",
  has_valid_date_range: "Date range valid",
  has_cover_image: "Cover image added",
  has_description: "Description added",
  has_on_sale_ticket_type: "On-sale ticket tier available",
  has_active_pricing_plan: "Active pricing plan",
  has_payout_account: "Payout account present",
}

function readinessScore(checks: Record<string, boolean>) {
  const entries = Object.entries(CHECK_LABELS)
  const passed = entries.filter(([key]) => checks?.[key]).length
  return { passed, total: entries.length }
}

export default async function SuperAdminReadinessPage() {
  await requireSuperAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("admin_event_readiness")
    .select("event_id, org_id, title, status, visibility, starts_at, ends_at, on_sale_ticket_types, has_active_pricing_plan, has_payout_account, checks")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(100)

  if (error) throw new Error(error.message)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-3 rounded-full px-0 hover:bg-transparent">
            <Link href="/super-admin"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Command Centre</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Event Readiness</h1>
          <p className="text-sm text-muted-foreground">Checklist view for events before publishing or campaign launch.</p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/super-admin/exports/orders"><Download className="mr-2 h-4 w-4" /> Export orders CSV</Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {((data ?? []) as ReadinessRow[]).map((event) => {
          const score = readinessScore(event.checks ?? {})
          const ready = score.passed === score.total
          return (
            <Card key={event.event_id} className="rounded-3xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{event.title ?? "Untitled event"}</CardTitle>
                    <CardDescription>{event.status} · {event.visibility} · {score.passed}/{score.total} checks passed</CardDescription>
                  </div>
                  <div className={ready ? "text-green-600" : "text-muted-foreground"}>
                    {ready ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm">
                  {Object.entries(CHECK_LABELS).map(([key, label]) => {
                    const passed = Boolean(event.checks?.[key])
                    return (
                      <div key={key} className="flex items-center justify-between rounded-2xl border px-3 py-2">
                        <span>{label}</span>
                        <span className={passed ? "text-green-600" : "text-muted-foreground"}>{passed ? "Pass" : "Missing"}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="rounded-full">
                    <Link href={`/super-admin/events/${event.event_id}`}>Open event</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link href="/super-admin/ticket-types">Ticket tiers</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
