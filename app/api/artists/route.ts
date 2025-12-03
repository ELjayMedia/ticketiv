import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json([])
    }

    const { data: artists, error } = await supabase.from("artists").select("*").order("name", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching artists:", error)
      return NextResponse.json([])
    }

    return NextResponse.json(artists || [])
  } catch (error) {
    console.error("[v0] Failed to fetch artists:", error)
    return NextResponse.json([])
  }
}
