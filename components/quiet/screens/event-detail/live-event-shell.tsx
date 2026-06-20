"use client"

import Link from "next/link"
import { useMemo } from "react"
import { MobileEvent, type MobileEventData } from "@/components/quiet/screens/event-detail/mobile-event"
import { DesktopEvent, type DesktopEventData } from "@/components/quiet/screens/event-detail/desktop-event"
import { useEventLiveStats, type EventLiveStats } from "@/lib/hooks/use-event-live-stats"

interface LiveEventShellProps {
  eventId: string
  mobile: MobileEventData
  desktop: DesktopEventData
  initialStats?: Partial<EventLiveStats> | null
}

export function LiveEventShell({ eventId, mobile, desktop, initialStats = null }: LiveEventShellProps) {
  const { stats } = useEventLiveStats(eventId, initialStats)

  const mergedMobile = useMemo<MobileEventData>(() => {
    if (!stats) return mobile

    return {
      ...mobile,
      soldCount: stats.tickets_sold ?? mobile.soldCount ?? null,
      attendeeCount: stats.checked_in_count ?? stats.tickets_sold ?? mobile.attendeeCount ?? null,
      recentSoldCount: mobile.recentSoldCount ?? null,
    }
  }, [mobile, stats])

  const mergedDesktop = useMemo<DesktopEventData>(() => {
    const baseDesktop: DesktopEventData = {
      ...desktop,
      soldCount: stats?.tickets_sold ?? desktop.soldCount ?? null,
      attendeeCount:
        stats?.checked_in_count ?? stats?.tickets_sold ?? desktop.attendeeCount ?? null,
      recentSoldCount: desktop.recentSoldCount ?? null,
    }

    const available = stats?.tickets_available
    if (
      typeof available === "number" &&
      Number.isFinite(available) &&
      (baseDesktop.ticketTypes?.length ?? 0) === 1
    ) {
      return {
        ...baseDesktop,
        ticketTypes: (baseDesktop.ticketTypes ?? []).map((ticket) => ({
          ...ticket,
          remaining: Math.max(0, available),
        })),
      }
    }

    return baseDesktop
  }, [desktop, stats])

  const allTicketTypesSoldOut =
    (mergedDesktop.ticketTypes?.length ?? 0) > 0 &&
    (mergedDesktop.ticketTypes ?? []).every((ticket) => ticket.remaining === 0)

  const liveSoldOut =
    typeof stats?.tickets_available === "number" &&
    Number.isFinite(stats.tickets_available) &&
    stats.tickets_available <= 0

  const showWaitlistEntry = liveSoldOut || allTicketTypesSoldOut
  const waitlistHref = `/waitlist?eventId=${encodeURIComponent(eventId)}`

  return (
    <>
      {showWaitlistEntry && (
        <SoldOutWaitlistBanner href={waitlistHref} />
      )}
      <div className="h-dvh md:hidden">
        <MobileEvent event={mergedMobile} />
      </div>
      <div className="hidden md:block">
        <DesktopEvent event={mergedDesktop} />
      </div>
    </>
  )
}

function SoldOutWaitlistBanner({ href }: { href: string }) {
  return (
    <div className="border-b border-line bg-accent-soft px-5 py-3 md:px-10">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[13px] font-semibold text-accent">Primary tickets are sold out</div>
          <div className="mt-0.5 font-mono text-[11px] text-ink-3">
            Join the waitlist so Ticketiv can notify you if more tickets become available.
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-accent px-3 py-2 text-[12px] font-semibold text-white hover:opacity-90"
        >
          Join waitlist
        </Link>
      </div>
    </div>
  )
}
