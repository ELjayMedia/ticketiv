import { NextResponse } from "next/server"

import { syncOfflineScans } from "@/lib/scanning"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return NextResponse.json({ error: "Scanner login required" }, { status: 401 })
  }

  const body = await request.json()
  try {
    const result = await syncOfflineScans(Array.isArray(body.scans) ? body.scans : [], session.user.id)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to sync scans" }, { status: 400 })
  }
}
