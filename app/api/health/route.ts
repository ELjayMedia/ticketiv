import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "ticketiv",
      runtime: "nextjs",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
