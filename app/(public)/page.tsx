import { getPublicArtists, getPublicEvents } from "@/lib/data/public"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import HomeClient from "./home-client"

export const dynamic = "force-dynamic"

type HomeVenue = {
  id: string
  name: string
  city: string | null
  address: string | null
  capacity: number | null
}

async function getPublicVenues(limit = 8): Promise<HomeVenue[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("venues")
    .select("id, name, city, address, capacity")
    .order("name", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Failed to load public venues", error)
    return []
  }

  return (data ?? []) as HomeVenue[]
}

export default async function PublicHomePage() {
  const [events, venues, artists] = await Promise.all([
    getPublicEvents({ limit: 24, sort: "date" }),
    getPublicVenues(8),
    getPublicArtists({ limit: 10 }),
  ])

  return <HomeClient initialEvents={events} initialVenues={venues} initialArtists={artists} />
}
