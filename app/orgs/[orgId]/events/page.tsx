import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { requireOrgCapability } from "@/lib/data/organizer/access"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { EmptyState } from "@/components/quiet/ui/empty-state"
import { EventsFilterBar } from "./events-filter-bar"
import { EventsGrid } from "./_components/events-grid"

export const dynamic = "force-dynamic"

const STATUS_OPTIONS = ["all", "published", "draft", "archived", "paused"] as const
type StatusFilter = (typeof STATUS_OPTIONS)[number]

export default async function OrgEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const { orgId } = await params
  await requireOrgCapability(orgId, "manage")
  const { q: rawQ, status: rawStatus } = await searchParams

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const searchQuery = rawQ?.trim() ?? ""
  const statusFilter: StatusFilter =
    (STATUS_OPTIONS.includes(rawStatus as StatusFilter) ? rawStatus : "all") as StatusFilter

  // Base events query with ilike search and status filter
  let query = supabase
    .from("events")
    .select("id, title, description, starts_at, status, cover_image_url")
    .eq("org_id", orgId)
    .order("starts_at", { ascending: false })

  if (searchQuery) {
    query = query.ilike("title", `%${searchQuery}%`)
  }
  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter as any)
  }

  const { data: eventsData = [] } = await query
  const events = eventsData ?? []

  // TICK-223: Fetch real sales stats from event_live_stats instead of the
  // hardcoded `count * 129` formula that was previously used.
  // TICK-226: Also fetch checked_in_count and capacity for sell-through % and check-in rate.
  const statsMap = new Map<
    string,
    { tickets_sold: number; gross_sales_cents: number; checked_in_count: number }
  >()
  const capacityMap = new Map<string, number>()

  // TICK-227: Determine if user can delete events (owner/admin roles only)
  const OWNER_ROLES = new Set(["organizer_owner", "organizer_admin", "admin"])
  let canDelete = false
  const { data: memberRow } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()
  if (memberRow && OWNER_ROLES.has(memberRow.role)) {
    canDelete = true
  } else {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle()
    if (adminRow) canDelete = true
  }

  if (events.length > 0) {
    const eventIds = events.map((e) => e.id)
    const [liveStatsResult, ttResult] = await Promise.all([
      supabase
        .from("event_live_stats")
        .select("event_id, tickets_sold, gross_sales_cents, checked_in_count")
        .in("event_id", eventIds),
      supabase
        .from("ticket_types")
        .select("event_id, quota")
        .in("event_id", eventIds),
    ])
    for (const s of liveStatsResult.data ?? []) {
      statsMap.set(s.event_id, {
        tickets_sold: s.tickets_sold ?? 0,
        gross_sales_cents: s.gross_sales_cents ?? 0,
        checked_in_count: s.checked_in_count ?? 0,
      })
    }
    for (const tt of ttResult.data ?? []) {
      capacityMap.set(tt.event_id, (capacityMap.get(tt.event_id) ?? 0) + (tt.quota ?? 0))
    }
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Events</h1>
            <p className="text-[13px] text-ink-3">
              Create and manage your events, track sales and revenue.
            </p>
          </div>
          <Link
            href={`/orgs/${orgId}/events/new`}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2 sm:w-auto"
          >
            <Icon name="plus" size={14} />
            Create event
          </Link>
        </div>

        {/* TICK-225: Search + status filter bar */}
        <EventsFilterBar currentQ={searchQuery} currentStatus={statusFilter} />

        {events.length === 0 ? (
          searchQuery || statusFilter !== "all" ? (
            <EmptyState
              icon="search"
              title="No events match"
              description={`Try a different search term or status filter.`}
              action={{ label: "Clear filters", href: `/orgs/${orgId}/events` }}
              compact
            />
          ) : (
            <Card flat className="border-dashed">
              <CardBody className="flex flex-col items-center gap-4 py-16 text-center">
                <Icon name="cal" size={32} className="text-ink-4" />
                <div className="flex max-w-md flex-col items-center gap-2">
                  <h2 className="text-h2">Create your first event</h2>
                  <p className="text-[13px] text-ink-3">
                    Get started by creating an event and start selling tickets to your audience.
                  </p>
                </div>
                <Link
                  href={`/orgs/${orgId}/events/new`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
                >
                  Create event
                </Link>
              </CardBody>
            </Card>
          )
        ) : (
          <EventsGrid
            events={events.map((event) => ({
              id: event.id,
              title: event.title,
              description: event.description ?? null,
              starts_at: event.starts_at ?? null,
              status: event.status,
              cover_image_url: event.cover_image_url ?? null,
              stats: statsMap.get(event.id) ?? {
                tickets_sold: 0,
                gross_sales_cents: 0,
                checked_in_count: 0,
              },
              capacity: capacityMap.get(event.id) ?? 0,
            }))}
            orgId={orgId}
            canDelete={canDelete}
          />
        )}
      </div>
    </main>
  )
}
