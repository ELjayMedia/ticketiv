import { getAllEvents } from "@/lib/events"
import BrowseClient from "./browse-client"

export const dynamic = "force-dynamic"

export default async function BrowsePage() {
  const events = await getAllEvents()
  return <BrowseClient initialEvents={events} />
}
