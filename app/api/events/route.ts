import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      shortDescription,
      fullDescription,
      category,
      tags,
      dates,
      venue_id,
      newVenue,
      coverImageUrl,
      isPublished,
      draftId,
    } = body

    const cookieStore = await cookies()
    const demoSessionCookie = cookieStore.get("demo_session")

    if (demoSessionCookie) {
      // Demo mode: return success with mock ID
      return NextResponse.json({
        success: true,
        eventId: draftId || `demo-event-${Date.now()}`,
        message: isPublished ? "Event published successfully" : "Draft saved successfully",
      })
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", session.user.id)
      .single()

    if (!orgMember?.org_id) {
      return NextResponse.json({ error: "Organization membership required" }, { status: 403 })
    }

    // Create venue if needed
    let finalVenueId = venue_id
    if (newVenue && !venue_id) {
      const venueSlug = (newVenue.name as string)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .insert({
          name: newVenue.name,
          slug: `${venueSlug}-${Date.now()}`,
          address: newVenue.address_line1 || newVenue.address || null,
          city: newVenue.city || null,
          capacity: newVenue.capacity || null,
        })
        .select()
        .single()

      if (venueError) throw venueError
      finalVenueId = venueData.id
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Create or update event
    const eventData = {
      org_id: orgMember.org_id,
      title,
      slug: draftId ? undefined : slug, // Don't update slug for existing events
      description: shortDescription || fullDescription || null,
      category,
      venue_id: finalVenueId,
      cover_image_url: coverImageUrl || null,
      visibility: isPublished ? "public" : "unlisted",
      status: (isPublished ? "published" : "draft") as "published" | "draft" | "archived",
    }

    let eventId = draftId
    let event

    if (draftId) {
      // Update existing draft
      const { data, error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", draftId)
        .eq("org_id", orgMember.org_id)
        .select()
        .single()

      if (error) throw error
      event = data
    } else {
      // Create new event
      const { data, error } = await supabase.from("events").insert(eventData).select().single()

      if (error) throw error
      event = data
      eventId = data.id
    }

    // Delete existing dates if updating
    if (draftId) {
      await supabase.from("event_dates").delete().eq("event_id", eventId)
    }

    // Insert event dates
    const eventDates = dates.map((date: any) => ({
      event_id: eventId,
      starts_at: date.starts_at,
      ends_at: date.ends_at,
      timezone: date.timezone,
    }))

    const { error: datesError } = await supabase.from("event_dates").insert(eventDates)
    if (datesError) throw datesError

    return NextResponse.json({
      success: true,
      eventId,
      message: isPublished ? "Event published successfully" : "Draft saved successfully",
    })
  } catch (error) {
    console.error("[v0] Event creation error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}
