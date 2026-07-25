import "server-only"

import { PAYSTACK_SECRET_KEY } from "@/lib/env"
import { createAdminClient } from "@/lib/supabase/admin"

export interface PaystackSettings {
  /** null when Paystack is disabled and no env fallback is configured. */
  secretKey: string | null
  webhookSecret: string | null
  callbackUrl: string | null
}

export type PaystackKeyMode = "test" | "live" | "unknown"

export function resolvePaystackKeyMode(secretKey: string | null | undefined): PaystackKeyMode {
  const key = (secretKey ?? "").trim()
  if (key.startsWith("sk_test_")) return "test"
  if (key.startsWith("sk_live_")) return "live"
  return "unknown"
}

/**
 * Refuse to charge real cards until the money path has passed UAT.
 *
 * Production, UAT and preview all run against the same Supabase project and the
 * same Vercel project (see docs/adr/0002-shared-supabase-environment.md), so a
 * live key configured anywhere is a live key everywhere — including on a
 * preview deployment built from a feature branch. Until the money path is
 * signed off, a live key is far more likely to be a mistake than an intent.
 *
 * Going live is therefore a deliberate two-part action: set an `sk_live_` key
 * *and* set PAYSTACK_ALLOW_LIVE_MODE=true. Neither alone charges anyone.
 */
export function assertPaystackModeAllowed(secretKey: string | null | undefined, allowLive: boolean) {
  if (resolvePaystackKeyMode(secretKey) === "live" && !allowLive) {
    throw new Error(
      "Refusing to use a live Paystack key: PAYSTACK_ALLOW_LIVE_MODE is not set to \"true\". " +
        "Ticketiv runs UAT against the same environment as production, so live keys stay disabled " +
        "until the money path is signed off (TICK-61).",
    )
  }
}

function liveModeAllowed() {
  return process.env.PAYSTACK_ALLOW_LIVE_MODE === "true"
}

/**
 * Single reader for the Paystack credentials (TICK-339). The row is only
 * honoured while `is_enabled` is set; `PAYSTACK_SECRET_KEY` remains the
 * fallback so preview environments work without a settings row.
 *
 * `secret_key` and `webhook_secret` must never reach the browser — every
 * caller of this module is `server-only`.
 */
export async function getPaystackSettings(): Promise<PaystackSettings> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("payment_provider_settings")
    .select("is_enabled, secret_key, webhook_secret, callback_url")
    .eq("provider", "paystack")
    .maybeSingle()

  const enabled = Boolean(data?.is_enabled)

  const settings: PaystackSettings = {
    secretKey: (enabled && data?.secret_key) || PAYSTACK_SECRET_KEY || null,
    webhookSecret: (enabled && (data?.webhook_secret || data?.secret_key)) || PAYSTACK_SECRET_KEY || null,
    callbackUrl: (enabled && data?.callback_url) || null,
  }

  assertPaystackModeAllowed(settings.secretKey, liveModeAllowed())
  return settings
}

export async function requirePaystackSecretKey(): Promise<string> {
  const { secretKey } = await getPaystackSettings()
  if (!secretKey) throw new Error("Missing Paystack secret key")
  return secretKey
}

export interface PaystackVerifiedTransaction {
  status: string
  reference: string
  amountCents: number
  currency: string
  raw: Record<string, unknown>
}

/**
 * Pull the authoritative state of a transaction from Paystack. This is how a
 * completion path that did not receive a signed webhook proves the payment is
 * real — the reference alone is attacker-supplied, the verify response is not.
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifiedTransaction> {
  const trimmed = (reference ?? "").trim()
  if (!trimmed) throw new Error("Missing Paystack reference")

  const secretKey = await requirePaystackSecretKey()
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(trimmed)}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: Record<string, any> }
    | null

  if (!response.ok || !payload?.status || !payload.data) {
    throw new Error(payload?.message || "Unable to verify Paystack transaction")
  }

  const data = payload.data
  return {
    status: String(data.status ?? ""),
    reference: String(data.reference ?? ""),
    amountCents: Number(data.amount ?? Number.NaN),
    currency: String(data.currency ?? ""),
    raw: data,
  }
}
