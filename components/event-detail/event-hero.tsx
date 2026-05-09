import { Badge } from "@/components/ui/badge"
import type { EventDetailData } from "@/lib/data/public/event-detail"
import { format } from "date-fns"

interface EventHeroProps {
  event: EventDetailData
}

function formatDatePill(startsAt: string | null, tz: string): string {
  if (!startsAt) return "Date TBA"
  try {
    const d = new Date(startsAt)
    return format(d, "EEE d MMM · HH:mm")
  } catch {
    return "Date TBA"
  }
}

export function EventHero({ event }: EventHeroProps) {
  const datePill = formatDatePill(event.starts_at, event.tz)

  return (
    <div className="relative w-full overflow-hidden bg-muted">
      {/* Hero image */}
      <div className="relative aspect-[16/9] max-h-[480px] w-full">
        {event.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              background: "linear-gradient(135deg, oklch(0.13 0.02 264) 0%, oklch(0.42 0.25 291) 100%)",
            }}
            role="img"
            aria-label={event.title}
          />
        )}

        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Date pill — top right */}
        <div className="absolute right-4 top-4 z-10">
          <Badge className="bg-black/60 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
            {datePill}
          </Badge>
        </div>

        {/* Title + category — bottom left */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
          {event.category && (
            <Badge className="mb-2 bg-primary/90 text-primary-foreground backdrop-blur-sm">
              {event.category}
            </Badge>
          )}
          <h1
            className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            {event.title}
          </h1>
          {(event.city || event.venue?.name) && (
            <p className="mt-1 text-sm text-white/80">
              {event.venue?.name ?? event.city}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
