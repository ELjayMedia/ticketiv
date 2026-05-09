import Link from "next/link"
import { Calendar, Clock, MapPin, Ticket } from "lucide-react"
import { formatCurrency } from "@/lib/pricing"
import type { EventDetailData } from "@/lib/data/public/event-detail"
import { format } from "date-fns"

interface EventQuickFactsProps {
  event: EventDetailData
}

function formatEventDate(startsAt: string | null): string {
  if (!startsAt) return "Date TBA"
  try {
    return format(new Date(startsAt), "EEEE, d MMMM yyyy")
  } catch {
    return "Date TBA"
  }
}

function formatEventTime(startsAt: string | null): string {
  if (!startsAt) return "Time TBA"
  try {
    return format(new Date(startsAt), "HH:mm")
  } catch {
    return "Time TBA"
  }
}

export function EventQuickFacts({ event }: EventQuickFactsProps) {
  const currency = event.ticket_types[0]?.currency ?? "ZAR"
  const minPrice = event.ticket_types.length > 0
    ? Math.min(...event.ticket_types.map((t) => t.price_cents))
    : null

  const facts = [
    {
      icon: Calendar,
      label: "Date",
      value: formatEventDate(event.starts_at),
    },
    {
      icon: Clock,
      label: "Time",
      value: formatEventTime(event.starts_at),
    },
    event.venue
      ? {
          icon: MapPin,
          label: "Venue",
          value: event.venue.slug
            ? { href: `/venues/${event.venue.slug}`, text: event.venue.name }
            : event.venue.name,
        }
      : null,
    minPrice != null
      ? {
          icon: Ticket,
          label: "Price",
          value: `From ${formatCurrency(minPrice, currency)}`,
        }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof Calendar
    label: string
    value: string | { href: string; text: string }
  }>

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4" role="region" aria-label="Event details">
      <dl className="space-y-3">
        {facts.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-foreground">
                {typeof value === "object" ? (
                  <Link
                    href={value.href}
                    className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  >
                    {value.text}
                  </Link>
                ) : (
                  value
                )}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  )
}
