import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getSeriesBySlug, getSeriesFollowState, type SeriesDetailEvent } from "@/lib/data/public/series"
import { describeRecurrence, type RecurrencePattern } from "@/lib/series/recurrence"
import { formatSeriesDateRange } from "@/lib/series/date-range"
import { SeriesEventRow } from "@/components/series/series-event-row"
import { PastEventsAccordion } from "@/components/series/past-events-accordion"
import { SeriesFollowButton } from "@/components/series/series-follow-button"

export const dynamic = "force-dynamic"

interface SeriesPageProps {
  params: Promise<{ slug: string }>
}

const SERIES_TYPE_LABELS: Record<"tour" | "recurring" | "season", string> = {
  tour: "Tour",
  recurring: "Recurring",
  season: "Season",
}

function partitionEvents(events: SeriesDetailEvent[]): {
  upcoming: SeriesDetailEvent[]
  past: SeriesDetailEvent[]
} {
  const now = Date.now()
  const upcoming: SeriesDetailEvent[] = []
  const past: SeriesDetailEvent[] = []
  for (const e of events) {
    const t = e.starts_at ? new Date(e.starts_at).getTime() : Infinity
    if (t >= now) upcoming.push(e)
    else past.push(e)
  }
  past.reverse()
  return { upcoming, past }
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = await params
  const series = await getSeriesBySlug(slug)
  if (!series) notFound()

  const followState = await getSeriesFollowState(series.id)
  const { upcoming, past } = partitionEvents(series.events)

  return (
    <main className="pb-16">
      {/* Hero */}
      <div className="relative w-full overflow-hidden bg-muted">
        <div className="relative aspect-[16/9] max-h-[420px] w-full">
          {series.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={series.cover_image_url}
              alt={series.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: "linear-gradient(135deg, oklch(0.13 0.02 264) 0%, oklch(0.42 0.25 291) 100%)",
              }}
              role="img"
              aria-label={series.title}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
            <Badge className="mb-2 bg-primary/90 text-primary-foreground backdrop-blur-sm">
              {SERIES_TYPE_LABELS[series.series_type]}
            </Badge>
            <h1
              className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl md:text-4xl"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              {series.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        {/* Organizer attribution + follow */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {series.organization ? (
            <Link
              href={`/organisers/${series.organization.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/50"
            >
              {series.organization.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={series.organization.logo}
                  alt=""
                  className="h-5 w-5 rounded-full object-cover"
                />
              )}
              <span>Hosted by {series.organization.name}</span>
            </Link>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {followState.followerCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {followState.followerCount} follower{followState.followerCount === 1 ? "" : "s"}
              </span>
            )}
            <SeriesFollowButton
              seriesId={series.id}
              seriesSlug={series.slug}
              initialFollowing={followState.following}
              signedIn={followState.signedIn}
            />
          </div>
        </div>

        {/* Description */}
        {series.description && (
          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {series.description}
          </p>
        )}

        <Separator className="my-8" />

        {series.series_type === "tour" && (
          <TourSection upcoming={upcoming} past={past} />
        )}
        {series.series_type === "recurring" && (
          <RecurringSection
            upcoming={upcoming}
            past={past}
            recurrence={series.recurrence_pattern}
          />
        )}
        {series.series_type === "season" && (
          <SeasonSection
            upcoming={upcoming}
            past={past}
            startsOn={series.starts_on}
            endsOn={series.ends_on}
          />
        )}
      </div>
    </main>
  )
}

function TourSection({
  upcoming,
  past,
}: {
  upcoming: SeriesDetailEvent[]
  past: SeriesDetailEvent[]
}) {
  return (
    <section aria-labelledby="tour-dates-heading" className="space-y-6">
      <h2 id="tour-dates-heading" className="font-display text-2xl font-bold">
        Tour dates
      </h2>
      {upcoming.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Dates coming soon
        </p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((event) => (
            <SeriesEventRow key={event.id} event={event} />
          ))}
        </div>
      )}
      {past.length > 0 && <PastEventsAccordion events={past} label="Past dates" />}
    </section>
  )
}

function RecurringSection({
  upcoming,
  past,
  recurrence,
}: {
  upcoming: SeriesDetailEvent[]
  past: SeriesDetailEvent[]
  recurrence: unknown
}) {
  const recurrenceText = describeRecurrence(recurrence as RecurrencePattern | null)
  const visible = upcoming.slice(0, 6)
  const hasMore = upcoming.length > 6

  return (
    <section aria-labelledby="upcoming-dates-heading" className="space-y-6">
      <div className="space-y-1">
        <h2 id="upcoming-dates-heading" className="font-display text-2xl font-bold">
          Upcoming dates
        </h2>
        {recurrenceText && <p className="text-sm text-muted-foreground">{recurrenceText}</p>}
      </div>
      {upcoming.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Next dates coming soon — follow this series for updates
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {visible.map((event) => (
              <SeriesEventRow key={event.id} event={event} />
            ))}
          </div>
          {hasMore && (
            <details className="rounded-xl border border-border/50 bg-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                View all upcoming dates ({upcoming.length}) →
              </summary>
              <div className="space-y-3 border-t border-border/40 px-4 py-4">
                {upcoming.slice(6).map((event) => (
                  <SeriesEventRow key={event.id} event={event} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
      {past.length > 0 && <PastEventsAccordion events={past} label="Past dates" />}
    </section>
  )
}

function SeasonSection({
  upcoming,
  past,
  startsOn,
  endsOn,
}: {
  upcoming: SeriesDetailEvent[]
  past: SeriesDetailEvent[]
  startsOn: string | null
  endsOn: string | null
}) {
  const dateRange = formatSeriesDateRange(startsOn, endsOn)
  const all = [...past.slice().reverse(), ...upcoming]

  return (
    <section aria-labelledby="season-schedule-heading" className="space-y-6">
      <div className="space-y-1">
        <h2 id="season-schedule-heading" className="font-display text-2xl font-bold">
          Season schedule
        </h2>
        {dateRange && <p className="text-sm text-muted-foreground">{dateRange}</p>}
      </div>
      {all.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Next dates coming soon — follow this series for updates
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {all.map((event) => {
            const isPast =
              event.starts_at != null && new Date(event.starts_at).getTime() < Date.now()
            return <SeriesEventRow key={event.id} event={event} past={isPast} />
          })}
        </div>
      )}
    </section>
  )
}
