import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { EventManagementTabs } from "@/components/event-management-tabs"
import { getMyOrgCapabilities } from "@/lib/data/organizer/access"
import { requireOrganizerEventManager } from "@/lib/org-management"
import { DuplicateEventButton } from "../_components/duplicate-event-button"
import { EventStatusBar } from "./_components/event-status-bar"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireEventManager } from "@/lib/organizer/access"

export const dynamic = "force-dynamic"

interface EventDetailPageProps {
  params: Promise<{
    orgId: string
    eventId: string
  }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { orgId, eventId } = await params
  const access = await requireEventManager(orgId, eventId)
  const { event } = await requireOrganizerEventManager(orgId, eventId)
  // Pause / cancel / archive: owners, admins and platform admins (was on the
  // retired Operations page).
  const canManageStatus =
    access.isPlatformAdmin || access.storedRole === "organizer_owner" || access.storedRole === "organizer_admin"
  let issuedTickets = 0
  if (canManageStatus) {
    const supabase = createServerSupabaseClient()
    const { data: stats } = supabase
      ? await (supabase as any).from("event_live_stats").select("tickets_sold").eq("event_id", eventId).maybeSingle()
      : { data: null }
    issuedTickets = Number(stats?.tickets_sold ?? 0)
  }
  const caps = await getMyOrgCapabilities(orgId)

  if (!event) return redirect("/403")

  const destinations = [
    {
      label: "Overview",
      description: "Live performance and event status.",
      href: `/orgs/${orgId}/events/${eventId}`,
      icon: "trending",
      visible: true,
    },
    {
      label: "Tickets",
      description: "Ticket types, pricing and inventory.",
      href: `/orgs/${orgId}/events/${eventId}/edit?step=tickets`,
      icon: "ticket",
      visible: caps.manage,
    },
    {
      label: "Orders",
      description: "Orders, attendees and exports.",
      href: `/orgs/${orgId}/events/${eventId}/orders`,
      icon: "fileText",
      visible: caps.manage,
    },
    {
      label: "Attendee guide",
      description: "Entry, directions, running order and updates for ticket holders.",
      href: `/orgs/${orgId}/events/${eventId}/guide`,
      icon: "info",
      visible: caps.manage,
    },
    {
      label: "Door",
      description: "Scanner, guestlist, box office, live counts and scan history.",
      href: `/orgs/${orgId}/events/${eventId}/door`,
      icon: "qr",
      visible: caps.manage || caps.staff,
    },
    {
      label: "Finance",
      description: "Workspace sales and payout activity.",
      href: `/orgs/${orgId}/finance`,
      icon: "wallet",
      visible: caps.payouts,
    },
    {
      label: "Settings",
      description: "Edit dates, venue, policies and publishing.",
      href: `/orgs/${orgId}/events/${eventId}/edit?step=basics`,
      icon: "settings",
      visible: caps.manage,
    },
  ].filter((item) => item.visible)

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/orgs/${orgId}/events`} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline">
              <Icon name="chevL" size={14} /> Back to events
            </Link>
            <Link href={`/orgs/${orgId}/dashboard`} className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline">
              Workspace dashboard
            </Link>
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <h1 className="text-h1">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              {canManageStatus && (
                <EventStatusBar orgId={orgId} eventId={eventId} status={event.status ?? ""} issuedTickets={issuedTickets} />
              )}
              {caps.manage && <DuplicateEventButton orgId={orgId} eventId={eventId} />}
            </div>
          </div>
          {event.description && <p className="mt-1 text-[14px] text-ink-3">{event.description}</p>}
        </div>

        <section aria-label="Event management" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((item) => (
            <Link key={item.label} href={item.href} className="block">
              <Card className="h-full transition-colors hover:border-line-2">
                <CardBody className="flex h-full items-start gap-3 p-4">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-ink-2">
                    <Icon name={item.icon as any} size={17} />
                  </span>
                  <div>
                    <h2 className="text-[14px] font-semibold text-ink">{item.label}</h2>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{item.description}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </section>

        {event.cover_image_url && (
          <Card className="overflow-hidden">
            <div className="h-64 w-full overflow-hidden">
              <img src={event.cover_image_url} alt={event.title ?? ""} className="h-full w-full object-cover" />
            </div>
          </Card>
        )}

        <EventManagementTabs
          eventId={eventId}
          orgId={orgId}
          event={{
            id: event.id,
            title: event.title ?? "",
            date: event.starts_at ?? "",
            status: event.status ?? "",
          }}
        />
      </div>
    </main>
  )
}
