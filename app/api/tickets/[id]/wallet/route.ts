import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getTicketById } from "@/lib/data/attendee/tickets"

/**
 * GET /api/tickets/[id]/wallet?platform=apple|google
 *
 * Wallet export entry point. Detects platform from the `platform` query param
 * (or User-Agent fallback) and returns one of:
 *
 *   - Apple Wallet → `application/vnd.apple.pkpass` (signed .pkpass file)
 *   - Google Wallet → `application/json` with `{ saveUrl }` to redirect to
 *
 * Signing requires provider credentials. While those env vars are absent the
 * route returns 503 with a structured payload so the client can fall back to
 * a print-friendly save instead of breaking.
 *
 * Apple env: APPLE_WALLET_PASS_TYPE_ID, APPLE_WALLET_TEAM_ID,
 *            APPLE_WALLET_CERT_PEM, APPLE_WALLET_CERT_KEY_PEM,
 *            APPLE_WALLET_WWDR_PEM
 * Google env: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_JSON,
 *             GOOGLE_WALLET_CLASS_ID
 */

type Platform = "apple" | "google" | "unknown"

function platformFromRequest(req: Request, override: string | null): Platform {
  const o = override?.toLowerCase()
  if (o === "apple" || o === "google") return o
  const ua = req.headers.get("user-agent")?.toLowerCase() ?? ""
  if (/iphone|ipad|ipod|macintosh/.test(ua)) return "apple"
  if (/android/.test(ua)) return "google"
  return "unknown"
}

function appleConfigured(): boolean {
  return Boolean(
    process.env.APPLE_WALLET_PASS_TYPE_ID &&
      process.env.APPLE_WALLET_TEAM_ID &&
      process.env.APPLE_WALLET_CERT_PEM &&
      process.env.APPLE_WALLET_CERT_KEY_PEM &&
      process.env.APPLE_WALLET_WWDR_PEM,
  )
}

function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
      process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON &&
      process.env.GOOGLE_WALLET_CLASS_ID,
  )
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const ticket = await getTicketById(id)
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
  }

  const url = new URL(req.url)
  const platform = platformFromRequest(req, url.searchParams.get("platform"))

  if (platform === "apple") {
    if (!appleConfigured()) {
      return NextResponse.json(
        {
          error: "apple_wallet_unavailable",
          message:
            "Apple Wallet signing isn't configured on this deployment. Use Save to keep an offline copy.",
        },
        { status: 503 },
      )
    }
    // When the certs land, this branch should serve a signed .pkpass built
    // from `ticket` (event title, venue, date, holder, ticket_code QR).
    return NextResponse.json(
      { error: "not_implemented", message: "Apple Wallet signer not yet wired." },
      { status: 501 },
    )
  }

  if (platform === "google") {
    if (!googleConfigured()) {
      return NextResponse.json(
        {
          error: "google_wallet_unavailable",
          message:
            "Google Wallet signing isn't configured on this deployment. Use Save to keep an offline copy.",
        },
        { status: 503 },
      )
    }
    return NextResponse.json(
      { error: "not_implemented", message: "Google Wallet signer not yet wired." },
      { status: 501 },
    )
  }

  return NextResponse.json(
    {
      error: "wallet_platform_unknown",
      message:
        "Wallet export is available on iOS (Apple Wallet) and Android (Google Wallet). Use Save instead.",
    },
    { status: 400 },
  )
}
