"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import {
  findNewTicketCheckIns,
  type TicketCheckIn,
  type TicketCheckInRow,
} from "@/lib/tickets/check-in-state"

export type { TicketCheckIn } from "@/lib/tickets/check-in-state"

export type TicketCheckInStatus = "idle" | "connecting" | "subscribed" | "fallback"

const FALLBACK_POLL_MS = 4_000

export function useTicketCheckIns({
  ticketIds,
  onCheckIn,
}: {
  ticketIds: string[]
  onCheckIn: (checkIn: TicketCheckIn) => void
}): { status: TicketCheckInStatus } {
  const supabase = useMemo(() => createClientSupabaseClient(), [])
  const subscriptionId = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const ticketIdsKey = Array.from(new Set(ticketIds)).sort().join(",")
  const watchedTicketIds = useMemo(
    () => (ticketIdsKey ? ticketIdsKey.split(",") : []),
    [ticketIdsKey],
  )
  const watchedTicketIdsRef = useRef(new Set(watchedTicketIds))
  const knownTicketIdsRef = useRef(new Set<string>())
  const onCheckInRef = useRef(onCheckIn)
  const [status, setStatus] = useState<TicketCheckInStatus>(
    watchedTicketIds.length > 0 ? "connecting" : "idle",
  )

  useEffect(() => {
    watchedTicketIdsRef.current = new Set(watchedTicketIds)
  }, [watchedTicketIds])

  useEffect(() => {
    onCheckInRef.current = onCheckIn
  }, [onCheckIn])

  useEffect(() => {
    if (!supabase || watchedTicketIds.length === 0) {
      setStatus("idle")
      return
    }

    const client = supabase

    let cancelled = false
    let checking = false
    let channel: ReturnType<typeof client.channel> | null = null

    const emitRows = (rows: TicketCheckInRow[]) => {
      const relevantRows = rows.filter((row) => watchedTicketIdsRef.current.has(row.order_item_id))
      const checkIns = findNewTicketCheckIns(relevantRows, knownTicketIdsRef.current)

      checkIns.forEach((checkIn) => {
        knownTicketIdsRef.current.add(checkIn.ticketId)
        onCheckInRef.current(checkIn)
      })
    }

    const refreshStatuses = async () => {
      if (checking || cancelled || document.hidden) return
      checking = true

      const { data, error } = await client
        .from("v_my_tickets")
        .select("order_item_id,checked_in_at")
        .in("order_item_id", watchedTicketIds)
        .not("checked_in_at", "is", null)

      checking = false
      if (cancelled) return

      if (error) {
        console.error("[ticket-check-ins] status refresh failed", error)
        setStatus((current) => (current === "subscribed" ? current : "fallback"))
        return
      }

      emitRows((data ?? []) as TicketCheckInRow[])
    }

    const start = async () => {
      setStatus("connecting")
      const {
        data: { user },
      } = await client.auth.getUser()

      if (cancelled) return
      if (!user) {
        setStatus("idle")
        return
      }

      await refreshStatuses()
      if (cancelled) return

      channel = client
        .channel(`ticket-check-ins:${user.id}:${subscriptionId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "order_items",
            filter: `current_owner_id=eq.${user.id}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            const row = payload.new as Partial<{
              id: string
              checked_in_at: string | null
            }>

            if (row.id && row.checked_in_at) {
              emitRows([{ order_item_id: row.id, checked_in_at: row.checked_in_at }])
            }
            void refreshStatuses()
          },
        )
        .subscribe((nextStatus: string) => {
          if (cancelled) return
          if (nextStatus === "SUBSCRIBED") setStatus("subscribed")
          if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
            setStatus("fallback")
          }
        })
    }

    const handleVisibility = () => {
      if (!document.hidden) void refreshStatuses()
    }
    const pollTimer = window.setInterval(() => void refreshStatuses(), FALLBACK_POLL_MS)

    void start()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      window.clearInterval(pollTimer)
      document.removeEventListener("visibilitychange", handleVisibility)
      if (channel) void client.removeChannel(channel)
    }
  }, [subscriptionId, supabase, ticketIdsKey, watchedTicketIds])

  return { status }
}
