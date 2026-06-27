import Link from "next/link"
import { format } from "date-fns"
import { requireOrgCapability } from "@/lib/data/organizer/access"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { listOrgSeries } from "@/lib/data/organizer/series"

export const dynamic = "force-dynamic"

const SERIES_TYPE_LABEL: Record<"tour" | "recurring" | "season", string> = {
  tour: "Tour",
  recurring: "Recurring",
  season: "Season",
}

function formatRange(startsOn: string | null, endsOn: string | null): string | null {
  if (!startsOn && !endsOn) return null
  if (startsOn && endsOn) {
    return `${format(new Date(startsOn), "MMM yyyy")} – ${format(new Date(endsOn), "MMM yyyy")}`
  }
  if (startsOn) return `From ${format(new Date(startsOn), "MMM yyyy")}`
  if (endsOn) return `Until ${format(new Date(endsOn), "MMM yyyy")}`
  return null
}

export default async function OrgSeriesPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  await requireOrgCapability(orgId, "manage")
  const series = await listOrgSeries(orgId)

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Series</h1>
            <p className="text-[13px] text-ink-3">
              Group tours, recurring nights and seasons under one roof.
            </p>
          </div>
          <Link
            href={`/orgs/${orgId}/series/new`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
          >
            <Icon name="plus" size={14} />
            New series
          </Link>
        </div>

        {series.length === 0 ? (
          <Card flat className="border-dashed">
            <CardBody className="flex flex-col items-center gap-4 px-4 py-16 text-center">
              <h2 className="text-h2">No series yet</h2>
              <p className="max-w-md text-[13px] text-ink-3">
                Tours, recurring nights, and seasons all live here.
              </p>
              <Link
                href={`/orgs/${orgId}/series/new`}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
              >
                Create your first series →
              </Link>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {series.map((s) => {
              const range = formatRange(s.starts_on, s.ends_on)
              return (
                <Card key={s.id} className="transition-colors hover:border-line-2">
                  <CardBody className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[14px] font-semibold text-ink">{s.title}</h3>
                        <Chip size="sm" variant="muted" className="capitalize">
                          {SERIES_TYPE_LABEL[s.series_type]}
                        </Chip>
                      </div>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                        {s.event_count} event{s.event_count === 1 ? "" : "s"}
                        {range && <span> · {range}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/orgs/${orgId}/series/${s.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                      >
                        <Icon name="settings" size={12} />
                        Edit
                      </Link>
                      <Link
                        href={`/series/${s.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-transparent bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-line/60"
                      >
                        <Icon name="arrowUR" size={12} />
                        Open public page
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
