import { notFound } from "next/navigation"
import { getEventById } from "@/lib/data/public/events"
import { EventDetailClient } from "./event-detail-client"

interface EventDetailPageProps {
  params: { id: string }
}

export default async function EventPage({ params }: EventDetailPageProps) {
  const event = await getEventById(params.id)

  if (!event) {
    notFound()
  }

  return <EventDetailClient event={event} />
}
