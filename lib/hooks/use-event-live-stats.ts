"use client"

import { useEffect, useId, useMemo, useState } from "react"
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function useEventLiveStats(
  eventId: string | null | undefined,
  initialStats?: Partial<EventLiveStats> | null,
) {
  const supabase = useMemo(() => createClient(), [])
  const subscriptionId = useId().replace(/[^a-zA-Z0-9_-]/g, "")
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

    const requestedEventId: string = eventId
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    setStatus("loading")

    async function startSubscription() {
      let resolvedEventId = requestedEventId

      // Public checkout components receive the event slug while organizer and
      // scanner surfaces pass the UUID. Resolve a slug once before querying or
      // subscribing so the event_live_stats filter always targets event_id.
      if (!UUID_PATTERN.test(resolvedEventId)) {
        const { data: event, error: eventError } = await supabase
          .from("events")
          .select("id")
          .eq("slug", resolvedEventId)
          .maybeSingle()

        if (cancelled) return
        if (eventError || !event?.id) {
          console.error("[event-live-stats] event resolution failed", eventError)
          setStatus("error")
          return
        }

        resolvedEventId = event.id
      }

      const { data, error } = await supabase
        .from("event_live_stats")
        .select(
          "event_id,tickets_sold,tickets_available,gross_sales_cents,successful_payments,failed_payments,checked_in_count,last_order_at,last_scan_at,updated_at",
        )
        .eq("event_id", resolvedEventId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error("[event-live-stats] initial fetch failed", error)
        setStatus("error")
        return
      }

      if (data) setStats(data as EventLiveStats)

      // Mobile and desktop checkout artboards are both mounted and only hidden
      // with CSS. Give each hook instance its own topic so one subscriber cannot
      // reuse an already-subscribed channel and then attempt to add callbacks.
      channel = supabase
        .channel(`event-live-stats:${resolvedEventId}:${subscriptionId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "event_live_stats",
            filter: `event_id=eq.${resolvedEventId}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") {
              setStats(null)
              return
            }

            setStats(payload.new as EventLiveStats)
          },
        )

      channel.subscribe((nextStatus) => {
        if (cancelled) return

        if (nextStatus === "SUBSCRIBED") setStatus("subscribed")

        if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
          setStatus("error")
        }
      })
    }

    void startSubscription()

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [eventId, subscriptionId, supabase])

  return { stats, status }
}
