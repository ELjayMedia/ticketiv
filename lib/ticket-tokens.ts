import "server-only"

import crypto from "crypto"

// TICK-75 — Capability tokens for ticket view links.
//
// A signed, time-boxed, single-resource token used in delivered URLs so
// WhatsApp/SMS/email recipients can open their ticket without a login wall.
//
// Properties:
// - HMAC-SHA256 over a tiny JSON payload, base64url(payload).base64url(sig).
// - Payload carries only the order_item_id, expiry, and a version — never
//   PII, ticket_code, or QR content.
// - Verification is constant-time and rejects expired / unsupported / malformed
//   tokens before any data lookup happens.
// - View-scoped: the route that consumes a token must never authorize a
//   mutation off it. Live ticket state (transferred/refunded/revoked/
//   checked-in) is still read from the database — a valid token does NOT mean
//   a valid ticket.

const VERSION = 1

interface TicketTokenPayload {
  oi: string
  exp: number
  v: number
}

function b64urlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url")
}

function b64urlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url")
}

function getSecret(): string | null {
  return process.env.TICKET_TOKEN_SECRET ?? null
}

export function isTicketTokenConfigured(): boolean {
  return Boolean(getSecret())
}

/**
 * Issue a view-only token for an order_item. Returns null when
 * TICKET_TOKEN_SECRET is unset so callers can fall back gracefully (dev).
 */
export function issueTicketToken(orderItemId: string, expEpochSeconds: number): string | null {
  const secret = getSecret()
  if (!secret) return null
  const payload: TicketTokenPayload = { oi: orderItemId, exp: Math.floor(expEpochSeconds), v: VERSION }
  const body = b64urlEncode(JSON.stringify(payload))
  const sig = b64urlEncode(crypto.createHmac("sha256", secret).update(body).digest())
  return `${body}.${sig}`
}

export type TicketTokenVerification =
  | { ok: true; orderItemId: string; expiresAt: Date }
  | { ok: false; reason: "missing_secret" | "malformed" | "bad_signature" | "expired" | "unsupported_version" }

export function verifyTicketToken(token: string): TicketTokenVerification {
  const secret = getSecret()
  if (!secret) return { ok: false, reason: "missing_secret" }
  const parts = token.split(".")
  if (parts.length !== 2) return { ok: false, reason: "malformed" }
  const [body, sig] = parts

  let provided: Buffer
  try {
    provided = b64urlDecode(sig)
  } catch {
    return { ok: false, reason: "malformed" }
  }
  const expected = crypto.createHmac("sha256", secret).update(body).digest()
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "bad_signature" }
  }

  let payload: TicketTokenPayload
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8")) as TicketTokenPayload
  } catch {
    return { ok: false, reason: "malformed" }
  }
  if (payload.v !== VERSION) return { ok: false, reason: "unsupported_version" }
  if (typeof payload.oi !== "string" || typeof payload.exp !== "number") {
    return { ok: false, reason: "malformed" }
  }
  const nowSec = Math.floor(Date.now() / 1000)
  if (payload.exp < nowSec) return { ok: false, reason: "expired" }
  return { ok: true, orderItemId: payload.oi, expiresAt: new Date(payload.exp * 1000) }
}
