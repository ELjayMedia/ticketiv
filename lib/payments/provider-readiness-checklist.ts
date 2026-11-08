// TICK-403: the minimum evidence before a payment provider may take real money.
//
// Mirrors app.provider_readiness_required_items() in
// supabase/migrations/20261112100000_tick403_provider_readiness_console.sql,
// which is what actually enforces it; the test in
// tests/provider-readiness-console.test.ts keeps the two in step. Pure data.

import type { CheckoutPaymentProvider } from "@/lib/payments/providers/catalog"

export type ReadinessItemId =
  | "merchant_agreement"
  | "kyb"
  | "credentials"
  | "callback"
  | "uat"
  | "data_protection"
  | "card_validation"
  | "settlement_refunds"

export const READINESS_ITEMS: ReadonlyArray<{ id: ReadinessItemId; label: string; hint: string }> = [
  { id: "merchant_agreement", label: "Merchant agreement", hint: "Signed contract or merchant account approval with the provider." },
  { id: "kyb", label: "Business verification (KYB)", hint: "The provider has verified Ticketiv's business documents." },
  { id: "credentials", label: "Live credentials", hint: "Production keys issued and stored in Vercel (where they live, never the keys)." },
  { id: "callback", label: "Callback / webhook", hint: "Live callback URL registered with the provider and a signed or verified delivery seen." },
  { id: "uat", label: "Money-path test", hint: "A full test purchase and refund passed end to end (link to the UAT record)." },
  { id: "data_protection", label: "Data protection", hint: "Processor terms / DPA signed; data roles agreed (TICK-254)." },
  { id: "card_validation", label: "Card validation", hint: "3-D Secure and card checks confirmed on live cards." },
  { id: "settlement_refunds", label: "Settlement and refunds", hint: "Settlement timing, payout account and refund procedure agreed and written down." },
]

const BASE: ReadinessItemId[] = ["merchant_agreement", "kyb", "credentials", "callback", "uat", "data_protection", "settlement_refunds"]

/** Card rails also need card validation. */
export function requiredReadinessItems(provider: CheckoutPaymentProvider): ReadinessItemId[] {
  return provider === "paystack"
    ? ["merchant_agreement", "kyb", "credentials", "callback", "uat", "data_protection", "card_validation", "settlement_refunds"]
    : [...BASE]
}

export interface ReadinessEvidence {
  item: string
  ref: string
  note: string | null
  recordedAt: string | null
  recordedBy: string | null
}

export function parseEvidence(value: unknown): ReadinessEvidence[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const e = entry as Record<string, unknown>
    if (typeof e.item !== "string" || typeof e.ref !== "string") return []
    return [
      {
        item: e.item,
        ref: e.ref,
        note: typeof e.note === "string" ? e.note : null,
        recordedAt: typeof e.recorded_at === "string" ? e.recorded_at : null,
        recordedBy: typeof e.recorded_by === "string" ? e.recorded_by : null,
      },
    ]
  })
}

export function missingReadinessItems(provider: CheckoutPaymentProvider, evidence: ReadinessEvidence[]): ReadinessItemId[] {
  const present = new Set(evidence.map((e) => e.item))
  return requiredReadinessItems(provider).filter((item) => !present.has(item))
}

/**
 * Evidence references are links or ticket numbers, never credentials. Refuse
 * anything shaped like a key or token before it reaches the database.
 */
export function looksLikeSecret(value: string): boolean {
  const text = value.trim()
  if (/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{8,}/.test(text)) return true
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)) return true
  if (/\b(eyJ[A-Za-z0-9_-]{10,}\.){2}/.test(text)) return true
  // A long unbroken run of key-like characters with no spaces, slashes or dots.
  return /^[A-Za-z0-9+_=-]{40,}$/.test(text)
}

export type ReadinessState = "live" | "not_approved" | "blocked"

export function readinessState(row: { productionReady: boolean; blockedAt: string | null }): ReadinessState {
  if (row.blockedAt) return "blocked"
  return row.productionReady ? "live" : "not_approved"
}
