import Link from "next/link"
import { Icon } from "@/components/quiet/ui/icon"
import { TicketTypeForm } from "../_components/ticket-type-form"

export default async function NewTicketTypePage({
  params,
}: {
  params: { orgId: string; eventId: string }
}) {
  const { orgId, eventId } = params

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}/tickets`}
            aria-label="Back to ticket types"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <h1 className="text-h1">New ticket type</h1>
        </div>

        <TicketTypeForm orgId={orgId} eventId={eventId} />
      </div>
    </main>
  )
}
