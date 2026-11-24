import Link from "next/link"

import { Icon } from "@/components/quiet/ui/icon"

/**
 * TICK-448 — anti-scam education when an event is sold out. Shown only when
 * every ticket type has run out and the event hasn't ended. Resale on Ticketiv
 * issues the buyer a fresh code, so the seller's copy stops working; tickets
 * bought elsewhere may be copies.
 */
export function SoldOutResaleNotice({
  ticketTypes,
  lifecycle,
  className,
}: {
  ticketTypes: ReadonlyArray<{ remaining: number | null }>
  lifecycle?: string | null
  className?: string
}) {
  const soldOut = ticketTypes.length > 0 && ticketTypes.every((t) => t.remaining === 0)
  if (!soldOut || lifecycle === "ended" || lifecycle === "cancelled") return null
  return (
    <div role="note" className={"flex items-start gap-2.5 rounded-[var(--radius-md)] border border-warning/30 bg-warning-soft p-3 " + (className ?? "")}>
      <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-warning" />
      <p className="text-[12px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">Sold out. Only buy resale tickets on Ticketiv.</span> Tickets sold on WhatsApp or social
        media may be fake or already used; a Ticketiv resale gives you a fresh code.{" "}
        <Link href="/support?topic=resale-scam" className="font-semibold text-accent hover:underline">
          Report a scam
        </Link>
      </p>
    </div>
  )
}
