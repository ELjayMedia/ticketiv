import Link from "next/link"
import { cn } from "@/lib/cn"

/**
 * Venues / Artists switch for the organiser's one Bookings section. Both lists
 * keep their own routes (detail pages and old links still work); this links
 * between them with the Segmented look.
 */
export function BookingsSwitch({ orgId, active }: { orgId: string; active: "venues" | "artists" }) {
  const tabs = [
    { key: "venues", label: "Venues", href: `/orgs/${orgId}/venue-enquiries` },
    { key: "artists", label: "Artists", href: `/orgs/${orgId}/artist-bookings` },
  ] as const
  return (
    <nav aria-label="Booking type" className="flex w-full max-w-xs rounded-[var(--radius-md)] bg-line/40 p-1">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-center text-[12px] font-medium transition-colors",
            t.key === active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
