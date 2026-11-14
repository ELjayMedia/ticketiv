import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const revision =
    process.env.SOURCE_COMMIT?.trim() || "unknown"

  return NextResponse.json(
    {
      ok: true,
      service: "ticketiv",
      runtime: "nextjs",
      revision,
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  )
}
