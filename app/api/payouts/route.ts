import { NextResponse } from "next/server"

import { getPayoutSummary } from "@/lib/payouts"

export async function GET() {
  const summary = await getPayoutSummary()
  return NextResponse.json(summary)
}
