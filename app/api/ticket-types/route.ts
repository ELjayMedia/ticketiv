import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const demoSessionCookie = cookieStore.get("demo_session")

    // Demo mode: Return success without persisting
    if (demoSessionCookie) {
      return NextResponse.json({
        success: true,
        message: "Demo mode: Ticket type would be created in production",
        id: `demo-ticket-${Date.now()}`,
      })
    }

    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      event_id,
      name,
      description,
      price_cents,
      currency,
      quota,
      per_user_limit,
      sale_start_at,
      sale_end_at,
      is_reserved_seating,
      channels,
    } = body

    // Verify event ownership
    const { data: event } = await supabase.from("events").select("org_id").eq("id", event_id).single()

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", session.user.id)
      .eq("org_id", event.org_id)
      .single()

    if (!orgMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Validate channel quotas
    const totalChannelQuota = channels.reduce((sum: number, ch: any) => sum + ch.quota, 0)
    if (totalChannelQuota > quota) {
      return NextResponse.json({ error: "Sum of channel quotas cannot exceed total quota" }, { status: 400 })
    }

    // Insert ticket type
    const { data: ticketType, error: ticketError } = await supabase
      .from("ticket_types")
      .insert({
        event_id,
        name,
        description,
        price_cents,
        currency,
        quota,
        per_user_limit,
        sale_start_at,
        sale_end_at,
        is_reserved_seating: is_reserved_seating || false,
        is_active: true,
      })
      .select()
      .single()

    if (ticketError) {
      console.error("[v0] Failed to create ticket type:", ticketError)
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    // Insert channel configs
    if (channels && channels.length > 0) {
      const channelInserts = channels.map((ch: any) => ({
        ticket_type_id: ticketType.id,
        channel: ch.channel,
        quota: ch.quota,
        per_order_limit: ch.per_order_limit,
      }))

      const { error: channelError } = await supabase.from("ticket_type_channels").insert(channelInserts)

      if (channelError) {
        console.error("[v0] Failed to create channels:", channelError)
        // Rollback: delete ticket type
        await supabase.from("ticket_types").delete().eq("id", ticketType.id)
        return NextResponse.json({ error: "Failed to configure channels" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, id: ticketType.id })
  } catch (error: any) {
    console.error("[v0] Ticket type creation error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
