import { NextResponse } from "next/server"

import { getSupabaseAdminConfig, getSupabasePublicConfig } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function GET() {
  const publicConfig = getSupabasePublicConfig()
  const adminConfig = getSupabaseAdminConfig()

  if (!publicConfig) {
    return NextResponse.json(
      {
        ok: false,
        service: "supabase",
        configured: false,
        missing: [
          ...(!process.env.NEXT_PUBLIC_SUPABASE_URL ? ["NEXT_PUBLIC_SUPABASE_URL"] : []),
          ...(!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? ["NEXT_PUBLIC_SUPABASE_ANON_KEY"] : []),
        ],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }

  if (!adminConfig) {
    return NextResponse.json(
      {
        ok: false,
        service: "supabase",
        configured: true,
        adminConfigured: false,
        missing: ["SUPABASE_SERVICE_ROLE_KEY"],
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from("events").select("id", { count: "exact", head: true }).limit(1)

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          service: "supabase",
          configured: true,
          adminConfigured: true,
          reachable: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        service: "supabase",
        configured: true,
        adminConfigured: true,
        reachable: true,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected Supabase health check failure"
    return NextResponse.json(
      {
        ok: false,
        service: "supabase",
        configured: true,
        adminConfigured: true,
        reachable: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
