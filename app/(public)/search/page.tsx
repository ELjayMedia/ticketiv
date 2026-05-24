import { SearchResults } from "@/components/quiet/screens/search/search-results"
import {
  getPublicSearchFacets,
  resolveWhenPreset,
  searchEvents,
  type SearchFilters,
} from "@/lib/data/public/search"
import { mapSearch } from "@/lib/mappers/search"

export const metadata = { title: "Search" }
export const dynamic = "force-dynamic"

interface SP {
  q?: string
  category?: string
  city?: string
  when?: string
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

  // `when` is a UX-friendly preset (tonight / weekend / week / month) that
  // resolves to a date window. Explicit startsAfter/startsBefore still win
  // so a future advanced-date picker can override the preset.
  const preset = resolveWhenPreset(sp.when)
  const startsAfter = sp.startsAfter || preset.startsAfter || undefined
  const startsBefore = sp.startsBefore || preset.startsBefore || undefined

  const filters: SearchFilters = {
    q: sp.q?.trim() || undefined,
    category: sp.category || undefined,
    city: sp.city || undefined,
    startsAfter,
    startsBefore,
    maxPriceCents: sp.maxPriceCents ? Number(sp.maxPriceCents) : undefined,
    onlyFree: sp.onlyFree === "1" || sp.onlyFree === "true",
    limit: 30,
  }

  const [results, facets] = await Promise.all([
    searchEvents(filters),
    getPublicSearchFacets(),
  ])
  const props = mapSearch(results, { ...filters, when: sp.when }, facets)

  return (
    <div className="mx-auto max-w-[480px] md:max-w-[680px]">
      <SearchResults {...props} />
    </div>
  )
}
