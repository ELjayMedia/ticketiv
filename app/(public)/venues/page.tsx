import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { VENUE_TYPES } from "@/lib/venues/marketplace"
import { searchVenues } from "@/lib/venues/marketplace-data"
import { hasVenueFilters, parseVenueSearch } from "@/lib/venues/search-params"

export const dynamic = "force-dynamic"

type Venue = {
  id: string
  slug: string
  name: string
  city: string | null
  address: string | null
  capacity: number | null
  /** Only set when searching by date. */
  available?: boolean | null
}

const INPUT =
  "h-[42px] w-full rounded-md border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

async function getVenues(): Promise<Venue[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("venues")
    .select("id, slug, name, city, address, capacity")
    .order("name", { ascending: true })

  if (error) return []
  return (data ?? []) as Venue[]
}

export default async function VenuesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseVenueSearch(await searchParams)
  const filtering = hasVenueFilters(filters)
  // Filtering searches verified venues (TICK-460); the plain list also shows venues hosting public events.
  const venues: Venue[] = filtering
    ? (await searchVenues(filters)).map((v) => ({ id: v.id, slug: v.slug, name: v.name, city: v.city, address: null, capacity: v.capacity, available: v.available }))
    : await getVenues()

  return (
    <main className="page-frame flex flex-col gap-8 py-8">
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

      <form method="get" className="grid gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_110px_110px_1fr_auto] lg:items-end" aria-label="Find a venue">
        <label className="flex flex-col gap-1">
          <span className="text-label">Town or city</span>
          <input name="city" defaultValue={filters.city ?? ""} className={INPUT} placeholder="Mbabane" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label">Type</span>
          <select name="type" defaultValue={filters.venueType ?? ""} className={INPUT}>
            <option value="">Any</option>
            {Object.entries(VENUE_TYPES).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label">Min. capacity</span>
          <input name="min" type="number" inputMode="numeric" min={1} defaultValue={filters.minCapacity ?? ""} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label">Max. capacity</span>
          <input name="max" type="number" inputMode="numeric" min={1} defaultValue={filters.maxCapacity ?? ""} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label">Free on</span>
          <input name="date" type="date" defaultValue={filters.date ?? ""} className={INPUT} />
        </label>
        <div className="flex gap-2">
          <button type="submit" className="h-[42px] rounded-[var(--radius)] border border-ink bg-ink px-4 text-[14px] font-semibold text-surface hover:bg-ink-2">
            Search
          </button>
          {filtering ? (
            <Link href="/venues" className="inline-flex h-[42px] items-center px-2 text-[13px] text-ink-3 hover:underline">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {venues.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {venues.map((venue) => (
            <Link key={venue.id} href={`/venues/${venue.slug}`} className="block">
            <Card className="h-full transition-colors hover:border-line-2">
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
                {venue.available === true ? (
                  <span className="w-fit rounded bg-success-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-success">Free on {filters.date}</span>
                ) : venue.available === false ? (
                  <span className="w-fit rounded bg-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-ink-3">Busy on {filters.date}</span>
                ) : null}
                {venue.capacity != null && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-bg px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    <Icon name="users" size={12} />
                    Capacity {venue.capacity.toLocaleString("en-SZ")}
                  </span>
                )}
              </CardBody>
            </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card flat className="border-dashed">
          <CardBody className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <Icon name="pin" size={32} className="text-ink-4" />
            <h2 className="text-h3">{filtering ? "No venues match" : "No venues yet"}</h2>
            <p className="max-w-md text-[13px] text-ink-3">
              {filtering
                ? "Try a wider capacity range or another town. Only verified venues appear in search."
                : "Venues will appear here once organisers start listing their event locations."}
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  )
}
