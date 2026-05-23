import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { SeriesForm } from "@/components/series/series-form"

export const dynamic = "force-dynamic"

export default async function NewSeriesPage({
  params,
}: {
  params: { orgId: string }
}) {
  const { orgId } = params
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
          <h1 className="mt-4 text-h1">New series</h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Spin up a tour, recurring night or season.
          </p>
        </div>

        <Card>
          <CardBody className="p-6">
            <SeriesForm orgId={orgId} mode="create" />
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
