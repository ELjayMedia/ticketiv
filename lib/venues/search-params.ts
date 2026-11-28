import { isVenueType, type VenueTypeKey } from "@/lib/venues/marketplace"

export interface VenueSearchFilters {
  city: string | null
  minCapacity: number | null
  maxCapacity: number | null
  venueType: VenueTypeKey | null
  date: string | null
}

function intParam(v: string | undefined): number | null {
  if (!v) return null
  const n = Number(v)
  return Number.isInteger(n) && n > 0 && n <= 200000 ? n : null
}

/** Parse /venues?city=&min=&max=&type=&date= ; anything malformed is ignored. */
export function parseVenueSearch(params: Record<string, string | string[] | undefined>): VenueSearchFilters {
  const one = (k: string) => {
    const v = params[k]
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined
  }
  const city = one("city")
  const type = one("type")
  const date = one("date")
  return {
    city: city ? city.slice(0, 80) : null,
    minCapacity: intParam(one("min")),
    maxCapacity: intParam(one("max")),
    venueType: isVenueType(type) ? type : null,
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : null,
  }
}

export function hasVenueFilters(f: VenueSearchFilters): boolean {
  return Boolean(f.city || f.minCapacity || f.maxCapacity || f.venueType || f.date)
}
