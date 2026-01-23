import { createServerSupabaseClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json([])
    }

    const { data: organisations, error } = await supabase
      .from("organizations")
      .select("*")
      .order("name", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching organisations:", error)
      return NextResponse.json([])
    }

    return NextResponse.json(organisations || [])
  } catch (error) {
    console.error("[v0] Failed to fetch organisations:", error)
    return NextResponse.json([])
  }
}
