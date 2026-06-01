import { redirect } from "next/navigation"
import Link from "next/link"

import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { EventManagementTabs } from "@/components/event-management-tabs"
import { requireOrganizerEventManager } from "@/lib/org-management"

export const dynamic = "force-dynamic"

interface EventDetailPageProps {
  params: {
    orgId: string
    eventId: string
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { orgId, eventId } = params
  const { event } = await requireOrganizerEventManager(orgId, eventId)

  if (!event) {
    return redirect("/403")
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div>
          <Link
            href={`/orgs/${orgId}/events`}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Back to events
          </Link>
          <h1 className="mt-4 text-h1">{event.title}</h1>
          {event.description && (
            <p className="mt-1 text-[14px] text-ink-3">{event.description}</p>
          )}
        </div>

        {event.cover_image_url && (
          <Card className="overflow-hidden">
            <div className="h-64 w-full overflow-hidden">
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="h-full w-full object-cover"
              />
            </div>
          </Card>
        )}

        <EventManagementTabs eventId={eventId} orgId={orgId} event={event} />
      </div>
    </main>
  )
}
