import { NextResponse } from "next/server"

import { validateTicket } from "@/lib/scanning"

export async function POST(request: Request) {
  const body = await request.json()
  const result = await validateTicket(String(body.code ?? ""))
  const status = result.valid ? 200 : 400

  return NextResponse.json(result, { status })
}
