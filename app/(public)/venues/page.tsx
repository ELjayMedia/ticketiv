import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
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

  if (error) return []
  return (data ?? []) as Venue[]
}

export default async function VenuesPage() {
  const venues = await getVenues()

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          <Icon name="chevL" size={14} />
          Back home
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Places</p>
        <h1 className="text-h1 sm:text-[32px]">Venues</h1>
        <p className="max-w-2xl text-[14px] leading-6 text-ink-3">
          Explore venues hosting events, culture, business, entertainment and community experiences on Ticketiv.
        </p>
      </div>

      {venues.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Card key={venue.id} className="transition-colors hover:border-line-2">
              <CardBody className="flex flex-col gap-4 p-5">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft text-accent">
                  <Icon name="pin" size={20} />
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-[16px] font-semibold text-ink">{venue.name}</h2>
                  <p className="text-[13px] text-ink-3">
                    {venue.city || venue.address || "Location TBA"}
                  </p>
                </div>
                {venue.capacity != null && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    <Icon name="users" size={12} />
                    Capacity {venue.capacity.toLocaleString("en-SZ")}
                  </span>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <Card flat className="border-dashed">
          <CardBody className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Icon name="pin" size={32} className="text-ink-4" />
            <h2 className="text-h3">No venues yet</h2>
            <p className="max-w-md text-[13px] text-ink-3">
              Venues will appear here once organisers start listing their event locations.
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  )
}
