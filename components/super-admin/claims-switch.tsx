import Link from "next/link"

import { cn } from "@/lib/cn"
import { listArtistClaims } from "@/lib/data/admin/artist-claims"
import { listVenueClaims } from "@/lib/data/admin/venue-claims"

/** Both claim queues' pending counts (the Claims nav item and its switch use them). */
export async function pendingClaimCounts() {
  const [venues, artists] = await Promise.all([listVenueClaims("pending"), listArtistClaims("pending")])
  return { venues: venues.length, artists: artists.length }
}

/**
 * Venues / Artists switch for the one admin Claims queue. Each list keeps its
 * own route and review actions; this links between them with pending counts.
 */
export async function ClaimsSwitch({ active }: { active: "venues" | "artists" }) {
  const counts = await pendingClaimCounts()
  const tabs = [
    { key: "venues", label: "Venues", href: "/super-admin/venue-claims", count: counts.venues },
    { key: "artists", label: "Artists", href: "/super-admin/artist-claims", count: counts.artists },
  ] as const
  return (
    <nav aria-label="Claim type" className="flex w-full max-w-xs rounded-[var(--radius-md)] bg-line/40 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-center text-[13px] font-medium transition-colors",
            t.key === active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
          )}
        >
          {t.label}
          {t.count > 0 ? <span className="ml-1.5 font-mono text-[11px] tabular-nums text-warning">{t.count}</span> : null}
        </Link>
      ))}
    </nav>
  )
}
