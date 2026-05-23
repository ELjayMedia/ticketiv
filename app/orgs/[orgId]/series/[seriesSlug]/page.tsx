import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { Divider } from "@/components/quiet/ui/primitives"
import { SeriesForm } from "@/components/series/series-form"
import { GenerateEventsButton } from "@/components/series/generate-events-button"
import { DeleteSeriesButton } from "@/components/series/delete-series-button"
import { getOrgSeriesBySlug } from "@/lib/data/organizer/series"

export const dynamic = "force-dynamic"

export default async function EditSeriesPage({
  params,
}: {
  params: { orgId: string; seriesSlug: string }
}) {
  const { orgId, seriesSlug } = params
  const series = await getOrgSeriesBySlug(orgId, seriesSlug)
  if (!series) notFound()

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-2xl flex-col gap-6 p-6">
        <div>
          <Link
            href={`/orgs/${orgId}/series`}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Back to series
          </Link>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h1 className="text-h1">{series.title}</h1>
            <Link
              href={`/series/${series.slug}`}
              target="_blank"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
            >
              <Icon name="arrowUR" size={12} />
              Open public page
            </Link>
          </div>
        </div>

        <Card>
          <CardBody className="p-6">
            <SeriesForm
              orgId={orgId}
              mode="edit"
              initial={{
                id: series.id,
                title: series.title,
                slug: series.slug,
                description: series.description ?? "",
                series_type: series.series_type,
                cover_image_url: series.cover_image_url ?? "",
                starts_on: series.starts_on ?? "",
                ends_on: series.ends_on ?? "",
                recurrence_pattern: (series.recurrence_pattern as never) ?? null,
              }}
            />
          </CardBody>
        </Card>

        {series.series_type === "recurring" && (
          <>
            <Divider />
            <GenerateEventsButton orgId={orgId} seriesId={series.id} />
          </>
        )}

        <Divider />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-h2">Events in this series</h2>
            <Link
              href={`/orgs/${orgId}/events/new?series_id=${series.id}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
            >
              <Icon name="plus" size={12} />
              Add event
            </Link>
          </div>

          {series.events.length === 0 ? (
            <Card flat className="border-dashed">
              <CardBody className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                <p className="text-[13px] text-ink-3">No events linked to this series yet.</p>
                <Link
                  href={`/orgs/${orgId}/events/new?series_id=${series.id}`}
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-3 py-1.5 text-[13px] font-semibold text-surface transition-colors hover:bg-ink-2"
                >
                  Add event to series
                </Link>
              </CardBody>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {series.events.map((event) => (
                <Card key={event.id} className="transition-colors hover:border-line-2">
                  <CardBody className="flex items-center justify-between gap-3 p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[14px] font-semibold text-ink">{event.title}</h3>
                        <Chip
                          size="sm"
                          variant={event.status === "published" ? "active" : "muted"}
                          className="capitalize"
                        >
                          {event.status}
                        </Chip>
                      </div>
                      <p className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                        <Icon name="cal" size={12} />
                        {event.starts_at
                          ? format(new Date(event.starts_at), "EEE d MMM yyyy")
                          : "Date TBA"}
                      </p>
                    </div>
                    <Link
                      href={`/orgs/${orgId}/events/${event.id}`}
                      className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                    >
                      Edit
                    </Link>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Divider />

        <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-danger/30 bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-[14px] font-semibold text-ink">Delete this series</h2>
            <p className="text-[12px] text-ink-3">
              Events in the series are kept as standalone events.
            </p>
          </div>
          <DeleteSeriesButton
            orgId={orgId}
            seriesId={series.id}
            seriesTitle={series.title}
            childEventCount={series.events.length}
          />
        </section>
      </div>
    </main>
  )
}
