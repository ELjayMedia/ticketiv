import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SeriesForm } from "@/components/series/series-form"

export const dynamic = "force-dynamic"

export default async function NewSeriesPage({
  params,
}: {
  params: { orgId: string }
}) {
  const { orgId } = params
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight">New series</h1>
          <p className="mt-1 text-muted-foreground">
            Spin up a tour, recurring night or season.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <SeriesForm orgId={orgId} mode="create" />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
