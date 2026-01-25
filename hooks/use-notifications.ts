"use client"

import { useEffect, useCallback } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { useToast } from "@/hooks/use-toast"

export type Notification = {
  id: string
  title: string
  body: string
  type?: "success" | "error" | "info" | "warning"
  timestamp: number
}

type UseNotificationsArgs = {
  userId?: string
}

export function useNotifications({ userId }: UseNotificationsArgs = {}) {
  const { toast } = useToast()

  useEffect(() => {
    if (!userId) return

    console.log("[v0] Setting up notifications for user:", userId)

    try {
      const supabase = createClientSupabaseClient()
      if (!supabase) {
        console.log("[v0] Supabase not configured, skipping notifications")
        return
      }

      const channel = supabase
        .channel(`notifications:user:${userId}`)
        .on("broadcast", { event: "new_notification" }, (payload: any) => {
          console.log("[v0] Received notification:", payload)

          const { message } = payload
          if (message && message.payload) {
            const notification = message.payload
            const variant =
              (notification.type as "default" | "destructive") || "default"

            toast({
              title: notification.title,
              description: notification.body,
              variant,
            })
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            console.log("[v0] Notifications channel subscribed for user:", userId)
          } else if (status === "CHANNEL_ERROR") {
            console.log("[v0] Notifications channel error")
          }
        })

      return () => {
        console.log("[v0] Cleaning up notifications channel for user:", userId)
        supabase.removeChannel(channel)
      }
    } catch (error) {
      console.error("[v0] Error setting up notifications:", error)
    }
  }, [userId, toast])
}
