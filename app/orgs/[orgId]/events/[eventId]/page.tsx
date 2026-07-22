import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { EventManagementTabs } from "@/components/event-management-tabs"
import { getMyOrgCapabilities } from "@/lib/data/organizer/access"
import { requireOrganizerEventManager } from "@/lib/org-management"
import { DuplicateEventButton } from "../_components/duplicate-event-button"

export const dynamic = "force-dynamic"

interface EventDetailPageProps {
  params: Promise<{
    orgId: string
    eventId: string
  }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { orgId, eventId } = await params
  const { event } = await requireOrganizerEventManager(orgId, eventId)
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
      label: "Check-in",
      description: "Open the event scanner and gate tools.",
      href: `/orgs/${orgId}/events/${eventId}/scanner`,
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
            {caps.manage && <DuplicateEventButton orgId={orgId} eventId={eventId} />}
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
