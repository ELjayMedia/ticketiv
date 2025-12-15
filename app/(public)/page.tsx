import { getAllEvents } from "@/lib/events"
import HomeClient from "./home-client"

export const dynamic = "force-dynamic"

export default async function PublicHomePage() {
  const events = await getAllEvents()
  return <HomeClient initialEvents={events} />
}
