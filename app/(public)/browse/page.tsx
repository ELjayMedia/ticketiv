import { getPublicEvents } from "@/lib/data/events"
import BrowseClient from "./browse-client"

export const dynamic = "force-dynamic"

export default async function BrowsePage() {
  const events = await getPublicEvents({ limit: 100 })
  return (
    <>
      <div className="hidden lg:block max-w-[1200px] mx-auto px-6 pt-12 pb-0">
        <h1 className="text-4xl md:text-5xl font-bold text-balance mb-8">Events</h1>
      </div>
      <BrowseClient initialEvents={events} />
    </>
  )
}
