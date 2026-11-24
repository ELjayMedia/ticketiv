import { Card, CardBody } from "@/components/quiet/ui/card"
import { acceptanceRate, monthLabel, type VenueUtilisation } from "@/lib/venues/utilisation"

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label">{label}</span>
      <span className="text-[22px] font-semibold leading-tight text-ink">{value}</span>
      {hint ? <span className="text-[12px] text-ink-3">{hint}</span> : null}
    </div>
  )
}

function Bar({ label, value, max, text }: { label: string; value: number; max: number; text: string }) {
  const pct = max > 0 ? Math.max(2, Math.round((100 * value) / max)) : 0
  return (
    <li className="grid grid-cols-[96px_1fr_auto] items-center gap-3 text-[13px]">
      <span className="truncate text-ink-2">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
        <span className="block h-full rounded-full bg-accent" style={{ width: value > 0 ? `${pct}%` : 0 }} />
      </span>
      <span className="font-mono text-[12px] text-ink-3">{text}</span>
    </li>
  )
}

/** Venue utilisation over a period (TICK-483). Aggregates only. */
export function UtilisationCard({ title, data }: { title: string; data: VenueUtilisation }) {
  const rate = acceptanceRate(data)
  const maxHours = Math.max(0, ...data.spaces.map((s) => s.bookedHours))
  return (
    <Card>
      <CardBody className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-h2">{title}</h2>
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
            {data.from} – {data.to}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Occupancy" value={`${data.occupancyPct.toLocaleString("en-GB")}%`} hint={`${data.occupiedDays} of ${data.days} days in use`} />
          <Stat label="Bookings" value={data.bookings.toLocaleString("en-GB")} hint={`${data.bookedHours.toLocaleString("en-GB")} hours booked`} />
          <Stat label="Events" value={data.events.toLocaleString("en-GB")} hint="Published at the venue" />
          <Stat
            label="Enquiries"
            value={data.enquiriesReceived.toLocaleString("en-GB")}
            hint={rate === null ? "None received" : `${rate}% accepted`}
          />
        </div>
        {data.blockedDays > 0 ? <p className="text-[12px] text-ink-3">{data.blockedDays} more day{data.blockedDays === 1 ? "" : "s"} blocked by your team.</p> : null}
        {data.spaces.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-label">Booked hours by space</h3>
            <ul className="flex flex-col gap-2">
              {data.spaces.map((s) => (
                <Bar key={s.spaceId} label={s.name} value={s.bookedHours} max={maxHours} text={`${s.bookedHours.toLocaleString("en-GB")} h`} />
              ))}
            </ul>
            {data.wholeVenueBookings > 0 ? (
              <p className="text-[12px] text-ink-3">Plus {data.wholeVenueBookings} whole-venue booking{data.wholeVenueBookings === 1 ? "" : "s"}.</p>
            ) : null}
          </div>
        ) : null}
        {data.months.length > 1 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-label">Days in use by month</h3>
            <ul className="flex flex-col gap-2">
              {data.months.map((m) => (
                <Bar key={m.month} label={monthLabel(m.month)} value={m.occupiedDays} max={m.days} text={`${m.occupiedDays}/${m.days}`} />
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-[12px] text-ink-3">Counts confirmed bookings and published events. No attendee or ticket information is included.</p>
      </CardBody>
    </Card>
  )
}
