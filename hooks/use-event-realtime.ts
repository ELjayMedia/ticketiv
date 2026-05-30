"use client"

import { useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"

type UseEventRealtimeArgs = {
  eventId: string
  onChange: (payload: any) => void
}

export function useEventRealtime({ eventId, onChange }: UseEventRealtimeArgs) {
  useEffect(() => {
    if (!eventId) return

    const supabase = createClientSupabaseClient()
    if (!supabase) return

    const channel = supabase
      .channel(`events:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          onChange(payload)
        }
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          console.log("[v0] Realtime subscription status:", status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, onChange])
}
