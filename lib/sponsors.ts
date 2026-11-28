// Event sponsors: shared types and messages (no server imports).
// Sponsors are one shared directory (like venues); only super admins change an existing logo.

/** A sponsor in the shared directory. */
export interface LibrarySponsor {
  id: string
  name: string
  logoUrl: string | null
  websiteUrl: string | null
}

/** A sponsor on one event, in display order. */
export interface EventSponsor extends LibrarySponsor {
  featured: boolean
}

/** What the public event page shows. */
export interface PublicSponsor {
  name: string
  logoUrl: string | null
  websiteUrl: string | null
  featured: boolean
}

export function sponsorErrorMessage(error: { message?: string } | null): string {
  const m = String(error?.message ?? "")
  if (m.includes("forbidden")) return "You can't change these sponsors."
  if (m.includes("name_required")) return "Enter the sponsor's name."
  if (m.includes("name_too_long")) return "Keep the sponsor's name under 120 characters."
  if (m.includes("logo_invalid")) return "Upload the logo again."
  if (m.includes("website_invalid")) return "Enter a website like example.com."
  if (m.includes("sponsor_exists")) return "A sponsor with that name already exists. Pick it from the list."
  if (m.includes("too_many_sponsors")) return "An event can show up to 30 sponsors."
  if (m.includes("not_found")) return "That sponsor no longer exists."
  if (m.includes("event_not_found")) return "Event not found."
  return "Couldn't save the sponsors. Try again."
}

/** Featured sponsors first, then the rest, keeping the organiser's order within each. */
export function splitSponsors<T extends { featured: boolean }>(sponsors: readonly T[]): { featured: T[]; others: T[] } {
  return { featured: sponsors.filter((s) => s.featured), others: sponsors.filter((s) => !s.featured) }
}
