import Link from "next/link"
import type { ReactNode } from "react"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { cn } from "@/lib/cn"
import { bookingStatusLabel, formatOffer } from "@/lib/artists/bookings"
import type { BookingDetail, BookingSummary } from "@/lib/artists/bookings-data"
import { formatMoney } from "@/lib/venues/marketplace"

const when = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Mbabane" }).format(new Date(iso))

function variant(status: string) {
  return status === "accepted" ? "active" : status === "open" || status === "countered" ? "accent" : "muted"
}

export function BookingList({ bookings, hrefFor, counterpart, empty }: {
  bookings: BookingSummary[]
  hrefFor: (b: BookingSummary) => string
  counterpart: (b: BookingSummary) => string
  empty: string
}) {
  if (bookings.length === 0) {
    return (
      <Card flat className="border-dashed">
        <CardBody className="p-5 text-[13px] text-ink-3">{empty}</CardBody>
      </Card>
    )
  }
  return (
    <Card>
      <ul className="divide-y divide-line">
        {bookings.map((b) => (
          <li key={b.id}>
            <Link href={hrefFor(b)} className="flex flex-col gap-1 px-5 py-3 hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] font-semibold text-ink">
                  {b.eventTitle} · {counterpart(b)}
                </span>
                <span className="font-mono text-[12px] text-ink-3">
                  {when(b.startsAt)}
                  {b.city ? ` · ${b.city}` : ""}
                </span>
              </div>
              <Chip size="sm" variant={variant(b.status) as any}>
                {bookingStatusLabel(b.status)}
              </Chip>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function BookingDetailView({ booking, side, actions, reply }: {
  booking: BookingDetail
  side: "artist" | "organizer"
  actions?: ReactNode
  reply?: ReactNode
}) {
  const offer = formatOffer(booking.offerMinCents, booking.offerMaxCents, booking.currency)
  const facts: Array<[string, string]> = [
    ["When", when(booking.startsAt)],
    ["Where", booking.city ?? "Not given"],
    ["Set length", booking.setMinutes ? `${booking.setMinutes} minutes` : "Not given"],
    ["Offer", offer ?? "Not given"],
  ]
  if (booking.counterCents != null) facts.push(["Counter-offer", formatMoney(booking.counterCents, booking.currency)])
  if (booking.agreedCents != null && booking.status === "accepted") facts.push(["Agreed fee", formatMoney(booking.agreedCents, booking.currency)])
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardBody className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <h1 className="text-h1">{booking.eventTitle}</h1>
              <span className="text-[13px] text-ink-3">{side === "artist" ? booking.orgName ?? "Organiser" : booking.artistName ?? "Artist"}</span>
            </div>
            <Chip size="sm" variant={variant(booking.status) as any}>
              {bookingStatusLabel(booking.status)}
            </Chip>
          </div>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {facts.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <dt className="text-label">{k}</dt>
                <dd className="text-[14px] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[12px] text-ink-3">Fees are agreed between you; payment happens outside Ticketiv.</p>
          {actions}
        </CardBody>
      </Card>
      <section aria-labelledby="booking-thread" className="flex flex-col gap-3">
        <h2 id="booking-thread" className="text-h2">
          Conversation
        </h2>
        <ol className="flex flex-col gap-2">
          {booking.messages.map((m) => (
            <li key={m.id} className={cn("flex flex-col gap-1 rounded-[var(--radius-md)] border p-3", m.side === side ? "border-accent/30 bg-accent-soft/40 sm:ml-10" : "border-line bg-surface sm:mr-10")}>
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                {m.side === "artist" ? booking.artistName ?? "Artist" : booking.orgName ?? "Organiser"}
                {m.mine ? " · you" : ""} ·{" "}
                {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Mbabane" }).format(new Date(m.createdAt))}
              </span>
              <p className="whitespace-pre-line text-[14px] text-ink">{m.body}</p>
            </li>
          ))}
        </ol>
        {reply}
      </section>
    </div>
  )
}
