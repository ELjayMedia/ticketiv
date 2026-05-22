import { SearchResults } from "@/components/quiet/screens/search/search-results"
import { searchEvents, type SearchFilters } from "@/lib/data/public/search"
import { mapSearch } from "@/lib/mappers/search"

export const metadata = { title: "Search" }
export const dynamic = "force-dynamic"

interface SP {
  q?: string
  category?: string
  city?: string
  startsAfter?: string
  startsBefore?: string
  maxPriceCents?: string
  onlyFree?: string
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<SP>
}) {
  const sp = (await searchParams) ?? {}
  const filters: SearchFilters = {
    q: sp.q?.trim() || undefined,
    category: sp.category || undefined,
    city: sp.city || undefined,
    startsAfter: sp.startsAfter || undefined,
    startsBefore: sp.startsBefore || undefined,
    maxPriceCents: sp.maxPriceCents ? Number(sp.maxPriceCents) : undefined,
    onlyFree: sp.onlyFree === "1" || sp.onlyFree === "true",
    limit: 30,
  }

  const results = await searchEvents(filters)
  const props = mapSearch(results, filters)

  return (
    <div className="mx-auto max-w-[480px] md:max-w-[680px]">
      <SearchResults {...props} />
    </div>
  )
}
