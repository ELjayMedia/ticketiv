import { NextResponse } from "next/server"

import { getScannableEvents } from "@/lib/data/scanner"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET() {
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Scanner login required" }, { status: 401 })
  }

  try {
    const events = await getScannableEvents()
    return NextResponse.json({ events })
  } catch (error: any) {
    console.error("Failed to list scannable events", error)
    return NextResponse.json({ error: error?.message ?? "Failed to load events" }, { status: 500 })
  }
}
