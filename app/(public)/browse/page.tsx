import { getPublicEvents } from "@/lib/data/events"
import BrowseClient from "./browse-client"

export const dynamic = "force-dynamic"

export default async function BrowsePage() {
  const events = await getPublicEvents({ limit: 100 })
  return <BrowseClient initialEvents={events} />
}
