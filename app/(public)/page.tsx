import { getPublicEvents } from "@/lib/data/public"
import HomeClient from "./home-client"

export const dynamic = "force-dynamic"

export default async function PublicHomePage() {
  const events = await getPublicEvents({ limit: 20 })
  return <HomeClient initialEvents={events} />
}
