import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { getDemoOrganizerEvents } from "@/lib/demo-data"

export const dynamic = "force-dynamic"

export default async function OrgEventsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let events: any[] = []

  if (demoSessionCookie) {
    try {
      events = getDemoOrganizerEvents(orgId)
    } catch {
      /* fall through */
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) return redirect("/login")

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return redirect("/login")

    const { data: eventsData = [] } = await supabase
      .from("events")
      .select(`
        id, title, description, date, status, cover_image_url,
        orders:order_items(count)
      `)
      .eq("org_id", orgId)
      .order("date", { ascending: false })

    events = eventsData ?? []
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

        {events.length === 0 ? (
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
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/orgs/${orgId}/events/${event.id}`} className="group block">
                <Card className="flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:border-line-2">
                  <div className="relative h-48 w-full overflow-hidden bg-bg">
                    {event.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon name="cal" size={32} className="text-ink-4" />
                      </div>
                    )}
                    <div className="absolute right-3 top-3">
                      <Chip size="sm" variant={event.status === "published" ? "active" : "muted"}>
                        {event.status}
                      </Chip>
                    </div>
                  </div>

                  <CardBody className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <h3 className="line-clamp-2 text-[16px] font-semibold leading-tight text-ink">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="line-clamp-1 text-[13px] text-ink-3">{event.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                      <Icon name="cal" size={12} />
                      <span className="truncate">{event.date}</span>
                    </div>

                    <CardDivider />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                          Tickets sold
                        </p>
                        <p className="font-mono text-[16px] font-semibold tabular-nums text-ink">
                          {event.orders?.[0]?.count || 0}
                        </p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                          Revenue
                        </p>
                        <p className="inline-flex items-center gap-1 font-mono text-[16px] font-semibold tabular-nums text-ink">
                          <Icon name="trending" size={14} className="text-success" />
                          ${((event.orders?.[0]?.count || 0) * 129).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
