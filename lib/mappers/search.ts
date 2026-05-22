// Shape fn_search_events rows → SearchResults screen props.

import { PHOTOS } from "@/lib/photos"
import type { SearchResults, SearchFilters } from "@/lib/data/public/search"
import type { ActiveFilter, SearchResultProp, SearchResultsProps } from "@/components/quiet/screens/search/search-results"

const WHEN_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const COVER_POOL = [PHOTOS.dj_set, PHOTOS.singer_red, PHOTOS.crowd_lights, PHOTOS.fest_river, PHOTOS.theatre_curtain]

function coverFor(url: string | null, seed: string): string {
  if (url) return url
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return COVER_POOL[Math.abs(h) % COVER_POOL.length]
}

function priceLabel(minor: number | null, currency: string | null): string {
  if (minor === null) return "TBA"
  if (minor === 0) return "Free"
  const cur = currency ?? "SZL"
  return `${cur} ${(minor / 100).toLocaleString()}`
}

export function mapSearch(results: SearchResults, filters: SearchFilters): SearchResultsProps {
  const active: ActiveFilter[] = []
  if (filters.category) active.push({ key: "category", label: filters.category })
  if (filters.city) active.push({ key: "city", label: filters.city })
  if (filters.onlyFree) active.push({ key: "onlyFree", label: "Free only" })
  if (filters.startsAfter) {
    const d = new Date(filters.startsAfter)
    active.push({ key: "startsAfter", label: `From ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` })
  }
  if (filters.startsBefore) {
    const d = new Date(filters.startsBefore)
    active.push({ key: "startsBefore", label: `Until ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` })
  }
  if (typeof filters.maxPriceCents === "number") {
    active.push({ key: "maxPriceCents", label: `Under ${(filters.maxPriceCents / 100).toLocaleString()}` })
  }

  const rows: SearchResultProp[] = results.rows.map((r) => {
    const start = r.starts_at ? new Date(r.starts_at) : null
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      cover: coverFor(r.cover_image_url, r.id),
      whenLabel: start ? WHEN_FMT.format(start) : "Date TBA",
      venue: r.venue_name ?? r.city ?? "TBA",
      city: r.city,
      priceLabel: priceLabel(r.min_price_cents, r.currency),
      isFree: r.min_price_cents === 0,
      category: r.category,
    }
  })

  return {
    query: results.query,
    filters: active,
    results: rows,
    totalCount: results.totalReturned,
  }
}
