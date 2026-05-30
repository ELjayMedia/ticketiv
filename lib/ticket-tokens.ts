import "server-only"

import crypto from "crypto"

// TICK-75 / TICK-77 — Capability tokens for ticket and order view links.
//
// A signed, time-boxed, single-resource token used in delivered URLs so
// WhatsApp/SMS/email recipients can open their ticket or order bundle without
// a login wall.
//
// Properties:
// - HMAC-SHA256 over a tiny JSON payload, base64url(payload).base64url(sig).
// - Payload carries only a scoped identifier, expiry, kind, and version — never
//   PII, ticket_code, or QR content.
// - Verification is constant-time and rejects expired / unsupported / malformed
//   tokens before any data lookup happens.
// - View-scoped: the route that consumes a token must never authorize a
//   mutation off it. Live ticket state (transferred/refunded/revoked/
//   checked-in) is still read from the database — a valid token does NOT mean
//   a valid ticket.

const VERSION = 1

type TicketTokenKind = "oi" | "or"

// Payload shape:
// - kind: "oi" + oi encodes a single order_item (per-ticket /t link).
// - kind: "or" + or encodes a whole order (buyer bundle /o link).
//
// Older TICK-75 per-item tokens did not include kind; verifyTicketToken still
// accepts those for backwards compatibility. New tokens always include kind so
// /t and /o tokens cannot be confused by shape alone.
interface TicketTokenPayload {
  kind?: TicketTokenKind
  oi?: string
  or?: string
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

function sign(payload: TicketTokenPayload, secret: string): string {
  const body = b64urlEncode(JSON.stringify(payload))
  const sig = b64urlEncode(crypto.createHmac("sha256", secret).update(body).digest())
  return `${body}.${sig}`
}

/**
 * Issue a view-only token for an order_item. Returns null when
 * TICKET_TOKEN_SECRET is unset so callers can fall back gracefully (dev).
 */
export function issueTicketToken(orderItemId: string, expEpochSeconds: number): string | null {
  const secret = getSecret()
  if (!secret) return null
  return sign({ kind: "oi", oi: orderItemId, exp: Math.floor(expEpochSeconds), v: VERSION }, secret)
}

/**
 * Issue a view-only token for a whole order — used for the buyer's bundle
 * link (/o/[token]). Per-attendee shares still use the per-item token.
 */
export function issueOrderToken(orderId: string, expEpochSeconds: number): string | null {
  const secret = getSecret()
  if (!secret) return null
  return sign({ kind: "or", or: orderId, exp: Math.floor(expEpochSeconds), v: VERSION }, secret)
}

export type VerificationFailure =
  | "missing_secret"
  | "malformed"
  | "bad_signature"
  | "expired"
  | "unsupported_version"

export type TicketTokenVerification =
  | { ok: true; orderItemId: string; expiresAt: Date }
  | { ok: false; reason: VerificationFailure }

export type OrderTokenVerification =
  | { ok: true; orderId: string; expiresAt: Date }
  | { ok: false; reason: VerificationFailure }

// Verifies signature, version, and expiry. Caller decides which kind it expects.
function verifyEnvelope(token: string): { ok: true; payload: TicketTokenPayload } | { ok: false; reason: VerificationFailure } {
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
  if (typeof payload.exp !== "number") return { ok: false, reason: "malformed" }
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" }
  return { ok: true, payload }
}

export function verifyTicketToken(token: string): TicketTokenVerification {
  const result = verifyEnvelope(token)
  if (!result.ok) return result
  const { payload } = result

  // Accept old TICK-75 tokens where kind was omitted, but reject explicit order
  // tokens on the /t route.
  if (payload.kind && payload.kind !== "oi") return { ok: false, reason: "malformed" }
  if (typeof payload.oi !== "string" || payload.or) return { ok: false, reason: "malformed" }
  return { ok: true, orderItemId: payload.oi, expiresAt: new Date(payload.exp * 1000) }
}

export function verifyOrderToken(token: string): OrderTokenVerification {
  const result = verifyEnvelope(token)
  if (!result.ok) return result
  const { payload } = result

  if (payload.kind !== "or") return { ok: false, reason: "malformed" }
  if (typeof payload.or !== "string" || payload.oi) return { ok: false, reason: "malformed" }
  return { ok: true, orderId: payload.or, expiresAt: new Date(payload.exp * 1000) }
}
