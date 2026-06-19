import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  try {
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
