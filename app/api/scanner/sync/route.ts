import { NextResponse } from "next/server"

import { syncOfflineScans } from "@/lib/scanning"

export async function POST(request: Request) {
  const body = await request.json()
  try {
    const result = await syncOfflineScans(Array.isArray(body.scans) ? body.scans : [])
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to sync scans" }, { status: 400 })
  }
}
