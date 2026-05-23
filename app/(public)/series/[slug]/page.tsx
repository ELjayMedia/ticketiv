import { notFound } from "next/navigation"
import Link from "next/link"

import { Chip } from "@/components/quiet/ui/chip"
import { Divider } from "@/components/quiet/ui/primitives"
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
      <div className="relative w-full overflow-hidden bg-bg">
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
                background: "linear-gradient(135deg, var(--color-ink) 0%, var(--color-accent) 100%)",
              }}
              role="img"
              aria-label={series.title}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
            <Chip size="sm" variant="accent" className="mb-2 backdrop-blur-sm">
              {SERIES_TYPE_LABELS[series.series_type]}
            </Chip>
            <h1
              className="text-[24px] font-semibold leading-tight tracking-tight text-white sm:text-[32px] md:text-[40px]"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
            >
              {series.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {series.organization ? (
            <Link
              href={`/organisers/${series.organization.slug}`}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink transition-colors hover:bg-bg"
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
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
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

        {series.description && (
          <p className="mt-6 whitespace-pre-line text-[14px] leading-relaxed text-ink-3">
            {series.description}
          </p>
        )}

        <Divider className="my-8" />

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

function EmptyTile({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--radius-md)] border border-dashed border-line-2 bg-surface px-4 py-8 text-center text-[13px] text-ink-3">
      {children}
    </p>
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
    <section aria-labelledby="tour-dates-heading" className="flex flex-col gap-6">
      <h2 id="tour-dates-heading" className="text-h1">Tour dates</h2>
      {upcoming.length === 0 ? (
        <EmptyTile>Dates coming soon</EmptyTile>
      ) : (
        <div className="flex flex-col gap-3">
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
    <section aria-labelledby="upcoming-dates-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="upcoming-dates-heading" className="text-h1">Upcoming dates</h2>
        {recurrenceText && <p className="text-[13px] text-ink-3">{recurrenceText}</p>}
      </div>
      {upcoming.length === 0 ? (
        <EmptyTile>Next dates coming soon — follow this series for updates</EmptyTile>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {visible.map((event) => (
              <SeriesEventRow key={event.id} event={event} />
            ))}
          </div>
          {hasMore && (
            <details className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-[14px] font-semibold text-ink">
                View all upcoming dates ({upcoming.length}) →
              </summary>
              <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
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
    <section aria-labelledby="season-schedule-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="season-schedule-heading" className="text-h1">Season schedule</h2>
        {dateRange && <p className="text-[13px] text-ink-3">{dateRange}</p>}
      </div>
      {all.length === 0 ? (
        <EmptyTile>Next dates coming soon — follow this series for updates</EmptyTile>
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
