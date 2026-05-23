"use client"

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

    if (
      typeof stats?.tickets_available === "number" &&
      Number.isFinite(stats.tickets_available) &&
      baseDesktop.ticketTypes.length === 1
    ) {
      return {
        ...baseDesktop,
        ticketTypes: baseDesktop.ticketTypes.map((ticket) => ({
          ...ticket,
          remaining: Math.max(0, stats.tickets_available),
        })),
      }
    }

    return baseDesktop
  }, [desktop, stats])

  return (
    <>
      <div className="h-dvh md:hidden">
        <MobileEvent event={mergedMobile} />
      </div>
      <div className="hidden md:block">
        <DesktopEvent event={mergedDesktop} />
      </div>
    </>
  )
}
