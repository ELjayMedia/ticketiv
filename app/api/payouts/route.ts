import { NextResponse } from "next/server"

import { getPayoutSummary } from "@/lib/payouts"

export async function GET() {
  const summary = getPayoutSummary()
  return NextResponse.json(summary)
}
