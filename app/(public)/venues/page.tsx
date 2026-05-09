import Link from "next/link"
import { ArrowLeft, MapPin, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type Venue = {
  id: string
  name: string
  city: string | null
  address: string | null
  capacity: number | null
}

async function getVenues(): Promise<Venue[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("venues")
    .select("id, name, city, address, capacity")
    .order("name", { ascending: true })

  if (error) {
    console.error("Failed to load venues", error)
    return []
  }

  return (data ?? []) as Venue[]
}

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px] space-y-8">
        <div>
          <Button asChild variant="ghost" className="mb-4 rounded-xl px-0 hover:bg-transparent">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back home
            </Link>
          </Button>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">Places</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">Venues</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Explore venues hosting events, culture, business, entertainment and community experiences on Ticketiv.
          </p>
        </div>

        {venues.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {venues.map((venue) => (
              <Card key={venue.id} className="rounded-2xl bg-card/90 transition hover:border-primary/50 hover:shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-semibold">{venue.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{venue.city || venue.address || "Location TBA"}</p>
                  {venue.capacity != null && (
                    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> Capacity {venue.capacity.toLocaleString("en-SZ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <MapPin className="mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-lg font-semibold">No venues yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">Venues will appear here once organisers start listing their event locations.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
