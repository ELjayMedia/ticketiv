import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
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
  has_online_sales_channel: "Online sales channel enabled",
  has_refund_or_support: "Refund or support policy set",
  has_active_staff: "Check-in staff assigned",
  has_live_stats_row: "Live stats initialized",
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
        <div className="flex flex-col gap-2">
          <Link
            href="/super-admin"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Back to Command Centre
          </Link>
          <h1 className="text-h1">Event readiness</h1>
          <p className="text-[13px] text-ink-3">
            Checklist view for events before publishing or campaign launch.
          </p>
        </div>
        <Link
          href="/super-admin/exports/orders"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
        >
          <Icon name="download" size={14} />
          Export orders CSV
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {((data ?? []) as ReadinessRow[]).map((event) => {
          const score = readinessScore(event.checks ?? {})
          const ready = score.passed === score.total
          return (
            <Card key={event.event_id}>
              <CardBody className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <p className="text-[16px] font-semibold text-ink">{event.title ?? "Untitled event"}</p>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {event.status} · {event.visibility} · {score.passed}/{score.total} checks passed
                    </p>
                  </div>
                  <Icon
                    name={ready ? "check" : "close"}
                    size={20}
                    className={ready ? "text-success" : "text-ink-3"}
                  />
                </div>

                <div className="grid gap-2 text-[13px]">
                  {Object.entries(CHECK_LABELS).map(([key, label]) => {
                    const passed = Boolean(event.checks?.[key])
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-[var(--radius-md)] border border-line px-3 py-2"
                      >
                        <span className="text-ink">{label}</span>
                        <span className={passed ? "font-mono text-[11px] uppercase tracking-wider text-success" : "font-mono text-[11px] uppercase tracking-wider text-ink-3"}>
                          {passed ? "Pass" : "Missing"}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <Link
                    href={`/super-admin/events/${event.event_id}`}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface transition-colors hover:bg-ink-2"
                  >
                    Open event
                  </Link>
                  <Link
                    href="/super-admin/ticket-types"
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                  >
                    Ticket tiers
                  </Link>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </main>
  )
}
