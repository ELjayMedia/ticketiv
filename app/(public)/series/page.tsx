import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { listPublicSeries, type SeriesSummary } from "@/lib/data/public/series"

export const dynamic = "force-dynamic"
export const metadata = { title: "Series" }

const SERIES_TYPE_LABELS: Record<SeriesSummary["series_type"], string> = {
  tour: "Tour",
  recurring: "Recurring",
  season: "Season",
}

const NEXT_DATE = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" })

/**
 * `/series` — public directory of event series (tours, recurring nights,
 * seasons). Linked from the desktop top bar; each card opens /series/[slug].
 */
export default async function SeriesIndexPage() {
  const series = await listPublicSeries()

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 sm:text-[32px]">Series</h1>
        <p className="text-[14px] text-ink-3">Tours, recurring nights and seasons. Follow one to hear about every date.</p>
      </div>

      {series.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {series.map((s) => (
            <Link key={s.id} href={`/series/${s.slug}`} className="block">
              <Card className="h-full overflow-hidden transition-colors hover:border-line-2">
                <div className="aspect-video overflow-hidden bg-surface-2">
                  {s.cover_image_url ? (
                    <img
                      src={s.cover_image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-4">
                      <Icon name="cal" size={28} />
                    </div>
                  )}
                </div>
                <CardBody className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Chip size="sm" variant="default">{SERIES_TYPE_LABELS[s.series_type] ?? "Series"}</Chip>
                    {s.organizationName && (
                      <span className="truncate text-[12px] text-ink-3">{s.organizationName}</span>
                    )}
                  </div>
                  <h2 className="line-clamp-2 text-[15px] font-semibold text-ink">{s.title}</h2>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    {s.nextStartsAt
                      ? `Next ${NEXT_DATE.format(new Date(s.nextStartsAt))} · ${s.upcomingCount} upcoming`
                      : "No upcoming dates"}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card flat className="border-dashed">
          <CardBody className="px-6 py-12 text-center">
            <p className="text-[13px] text-ink-3">No series yet. Check back when organisers announce a tour or season.</p>
          </CardBody>
        </Card>
      )}
    </main>
  )
}
