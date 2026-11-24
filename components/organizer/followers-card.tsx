import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { sparklinePoints, type FollowerTrend } from "@/lib/follows/trend"

/** Followers card with a 30-day trend for the organiser dashboard (TICK-434). */
export function FollowersCard({ trend, publicHref }: { trend: FollowerTrend; publicHref: string }) {
  const values = trend.daily.map((d) => d.total)
  const points = sparklinePoints(values, 160, 40)
  const belowThreshold = trend.total < trend.publicThreshold
  return (
    <Card>
      <CardBody className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-ink-3">
            <Icon name="bell" size={13} /> Followers
          </span>
          <span className="text-[28px] font-semibold leading-none text-ink">{trend.total.toLocaleString("en-GB")}</span>
          <span className="text-[12px] text-ink-3">
            {trend.new30d > 0 ? `+${trend.new30d.toLocaleString("en-GB")} in the last 30 days` : "No new followers in the last 30 days"}
          </span>
          <span className="text-[12px] text-ink-3">
            {belowThreshold
              ? `Your public page shows the count once you reach ${trend.publicThreshold}.`
              : "Shown on your public page."}{" "}
            Followers hear about every event you publish.{" "}
            <Link href={publicHref} className="font-semibold text-accent hover:underline">
              View public page
            </Link>
          </span>
        </div>
        {values.length > 1 ? (
          <svg
            viewBox="-2 -2 164 44"
            width="164"
            height="44"
            role="img"
            aria-label={`Followers over the last 30 days, from ${values[0]} to ${values[values.length - 1]}`}
            className="shrink-0 text-accent"
          >
            <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
        ) : null}
      </CardBody>
    </Card>
  )
}
