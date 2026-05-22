import { notFound } from "next/navigation"
import { SeatingChart } from "@/components/quiet/screens/seating/seating-chart"
import { getEventSeatingChart } from "@/lib/data/attendee/seating"

export const metadata = { title: "Pick seats" }
export const dynamic = "force-dynamic"

export default async function SeatingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const chart = await getEventSeatingChart(id)
  if (!chart) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-[480px]">
      <SeatingChart chart={chart!} />
    </div>
  )
}
