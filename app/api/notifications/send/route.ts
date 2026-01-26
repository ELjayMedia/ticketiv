import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/notifications/send
 * Send a notification to a user via Supabase Edge Function
 * 
 * Example request:
 * {
 *   "user_id": "user-uuid",
 *   "title": "Event Started",
 *   "body": "Your event has begun!"
 * }
 */
export async function POST(request: Request) {
  try {
    const { user_id, title, body } = await request.json()

    if (!user_id || !title) {
      return NextResponse.json(
        { error: "user_id and title are required" },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[v0] Supabase environment variables not configured")
      return NextResponse.json(
        { error: "Supabase not configured" },
        { status: 500 }
      )
    }

    // Call the Supabase Edge Function to send the notification
    const functionUrl = `${supabaseUrl}/functions/v1/send-notification`

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        user_id,
        title,
        body: body || "",
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] Edge function error:", data)
      return NextResponse.json(
        { error: data.error || "Failed to send notification" },
        { status: response.status }
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
