import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Calendar, ExternalLink, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href={`/orgs/${orgId}/series`}>
              <ArrowLeft className="mr-1 h-3 w-3" aria-hidden="true" />
              Back to series
            </Link>
          </Button>
          <div className="mt-2 flex items-center justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{series.title}</h1>
            <Button asChild variant="outline" size="sm">
              <Link href={`/series/${series.slug}`} target="_blank">
                <ExternalLink className="mr-1 h-3 w-3" aria-hidden="true" />
                Open public page
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
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
                recurrence_pattern:
                  (series.recurrence_pattern as never) ?? null,
              }}
            />
          </CardContent>
        </Card>

        {series.series_type === "recurring" && (
          <>
            <Separator />
            <GenerateEventsButton orgId={orgId} seriesId={series.id} />
          </>
        )}

        <Separator />

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Events in this series</h2>
            <Button asChild size="sm" variant="outline">
              <Link href={`/orgs/${orgId}/events/new?series_id=${series.id}`}>
                <Plus className="mr-1 h-3 w-3" aria-hidden="true" />
                Add event
              </Link>
            </Button>
          </div>

          {series.events.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No events linked to this series yet.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href={`/orgs/${orgId}/events/new?series_id=${series.id}`}>
                    Add event to series
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {series.events.map((event) => (
                <Card key={event.id} className="transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{event.title}</h3>
                        <Badge variant={event.status === "published" ? "default" : "secondary"} className="capitalize">
                          {event.status}
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {event.starts_at
                          ? format(new Date(event.starts_at), "EEE d MMM yyyy")
                          : "Date TBA"}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/orgs/${orgId}/events/${event.id}`}>Edit</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <Separator />

        <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Delete this series</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
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
