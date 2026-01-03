import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { cookies } from "next/headers"
import { DEMO_VENUES } from "@/lib/demo-data"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const demoSessionCookie = cookieStore.get("demo_session")

    if (demoSessionCookie) {
      return NextResponse.json({ venues: DEMO_VENUES })
    }

    const supabase = await createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { data: venues, error } = await supabase
      .from("venues")
      .select("id, name, address_line1, city, state, country, capacity")
      .order("name")

    if (error) throw error

    return NextResponse.json({ venues: venues || [] })
  } catch (error) {
    console.error("[v0] Venues fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch venues" }, { status: 500 })
  }
}
