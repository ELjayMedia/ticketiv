"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface EventLiveStats {
  event_id: string
  tickets_sold: number
  tickets_available: number
  gross_sales_cents: number
  successful_payments: number
  failed_payments: number
  checked_in_count: number
  last_order_at: string | null
  last_scan_at: string | null
  updated_at: string
}

export function useEventLiveStats(
  eventId: string | null | undefined,
  initialStats?: Partial<EventLiveStats> | null,
) {
  const supabase = useMemo(() => createClient(), [])
  const [stats, setStats] = useState<Partial<EventLiveStats> | null>(
    initialStats ?? null,
  )
  const [status, setStatus] = useState<"idle" | "loading" | "subscribed" | "error">(
    eventId ? "loading" : "idle",
  )

  useEffect(() => {
    if (!eventId) {
      setStatus("idle")
      return
    }

    let cancelled = false
    setStatus("loading")

    supabase
      .from("event_live_stats")
      .select(
        "event_id,tickets_sold,tickets_available,gross_sales_cents,successful_payments,failed_payments,checked_in_count,last_order_at,last_scan_at,updated_at",
      )
      .eq("event_id", eventId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return

        if (error) {
          console.error("[event-live-stats] initial fetch failed", error)
          setStatus("error")
          return
        }

        if (data) setStats(data as EventLiveStats)
      })

    const channel = supabase
      .channel(`event-live-stats:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_live_stats",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setStats(null)
            return
          }

          setStats(payload.new as EventLiveStats)
        },
      )
      .subscribe((nextStatus) => {
        if (cancelled) return

        if (nextStatus === "SUBSCRIBED") setStatus("subscribed")

        if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
          setStatus("error")
        }
      })

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [eventId, supabase])

  return { stats, status }
}
