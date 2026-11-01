import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { EmptyState } from "@/components/quiet/ui/empty-state"
import { Icon } from "@/components/quiet/ui/icon"

export interface DoorEvent {
  id: string
  title: string
  starts_at: string | null
  ends_at: string | null
  status: string
  cover_image_url: string | null
  /** Event-level manager assignment: also show "Manage event". */
  manages: boolean
}

/** Today's and upcoming events first, then past ones. */
export function sortDoorEvents(events: DoorEvent[], now = Date.now()): { current: DoorEvent[]; past: DoorEvent[] } {
  const ended = (e: DoorEvent) => {
    const end = e.ends_at ?? e.starts_at
    return end ? new Date(end).getTime() < now - 6 * 60 * 60 * 1000 : false
  }
  const byStart = (a: DoorEvent, b: DoorEvent) =>
    new Date(a.starts_at ?? 0).getTime() - new Date(b.starts_at ?? 0).getTime()
  return {
    current: events.filter((e) => !ended(e) && e.status !== "cancelled").sort(byStart),
    past: events.filter((e) => ended(e) || e.status === "cancelled").sort(byStart).reverse(),
  }
}

function formatWhen(iso: string | null) {
  if (!iso) return "Date TBA"
  return new Date(iso).toLocaleString("en-SZ", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * Events list for door staff and scanners (ADR 0002): the events they work,
 * each opening the door page. No sales figures or management actions.
 */
export function DoorEventList({ orgId, events }: { orgId: string; events: DoorEvent[] }) {
  const { current, past } = sortDoorEvents(events)

  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-h1">My events</h1>
          <p className="text-[13px] text-ink-3">Pick an event to scan tickets, check in the guestlist or sell at the door.</p>
        </div>

        {events.length === 0 ? (
          <EmptyState
            icon="cal"
            title="No events assigned yet"
            description="When an organizer adds you to an event, it shows up here."
          />
        ) : (
          <>
            <DoorEventSection orgId={orgId} title="Today and upcoming" events={current} />
            {past.length > 0 && <DoorEventSection orgId={orgId} title="Past" events={past} muted />}
          </>
        )}
      </div>
    </main>
  )
}

function DoorEventSection({
  orgId,
  title,
  events,
  muted = false,
}: {
  orgId: string
  title: string
  events: DoorEvent[]
  muted?: boolean
}) {
  if (events.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{title}</h2>
      <div className="flex flex-col gap-2">
        {events.map((event) => (
          <Link key={event.id} href={`/orgs/${orgId}/events/${event.id}/door`} className="group">
            <Card className={muted ? "opacity-70" : undefined}>
              <CardBody className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[var(--radius)] bg-surface-2">
                  {event.cover_image_url ? (
                    <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-ink-4">
                      <Icon name="cal" size={18} />
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold text-ink">{event.title}</span>
                  <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                    <Icon name="clock" size={12} />
                    {formatWhen(event.starts_at)}
                  </span>
                </div>
                {event.status === "cancelled" && <Chip variant="muted">Cancelled</Chip>}
                <Icon name="chevR" size={16} className="shrink-0 text-ink-4 group-hover:text-ink" />
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
