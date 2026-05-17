import Link from "next/link"
import { format } from "date-fns"
import { Plus, ExternalLink, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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
  params: { orgId: string }
}) {
  const { orgId } = params
  const series = await listOrgSeries(orgId)

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Series</h1>
            <p className="mt-1 text-muted-foreground">
              Group tours, recurring nights and seasons under one roof.
            </p>
          </div>
          <Button asChild>
            <Link href={`/orgs/${orgId}/series/new`}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New series
            </Link>
          </Button>
        </div>

        {series.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <h2 className="text-xl font-bold">No series yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Tours, recurring nights, and seasons all live here.
              </p>
              <Button asChild className="mt-6">
                <Link href={`/orgs/${orgId}/series/new`}>Create your first series →</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {series.map((s) => {
              const range = formatRange(s.starts_on, s.ends_on)
              return (
                <Card key={s.id} className="transition-colors hover:border-primary/50">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{s.title}</h3>
                        <Badge variant="secondary" className="capitalize">
                          {SERIES_TYPE_LABEL[s.series_type]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {s.event_count} event{s.event_count === 1 ? "" : "s"}
                        {range && <span> · {range}</span>}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/orgs/${orgId}/series/${s.slug}`}>
                          <Pencil className="mr-1 h-3 w-3" aria-hidden="true" />
                          Edit
                        </Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/series/${s.slug}`} target="_blank">
                          <ExternalLink className="mr-1 h-3 w-3" aria-hidden="true" />
                          Open public page
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
