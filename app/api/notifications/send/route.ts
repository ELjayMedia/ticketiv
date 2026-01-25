import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

/**
 * POST /api/notifications/send
 * Send a notification to a user via Realtime broadcast
 * 
 * Example request:
 * {
 *   "user_id": "user-uuid",
 *   "title": "Event Started",
 *   "body": "Your event has begun!",
 *   "type": "info"
 * }
 */
export async function POST(request: Request) {
  try {
    const { user_id, title, body, type } = await request.json()

    if (!user_id || !title) {
      return NextResponse.json(
        { error: "user_id and title are required" },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      )
    }

    const topic = `notifications:user:${user_id}`
    const payload = {
      title,
      body,
      type: type || "info",
      timestamp: Date.now(),
    }

    // Broadcast the notification via Realtime
    const { error } = await supabase.channel(topic).send("broadcast", {
      event: "new_notification",
      payload,
    })

    if (error) {
      console.error("[v0] Failed to broadcast notification:", error)
      return NextResponse.json(
        { error: "Failed to send notification" },
        { status: 500 }
      )
    }

    console.log("[v0] Notification sent to user:", user_id)
    return NextResponse.json(
      { success: true, message: "Notification sent" },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Notification endpoint error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
