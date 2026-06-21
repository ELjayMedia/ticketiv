// Provider selection via payment_routing_rules (TICK-179).
//
// The matcher is pure (unit-tested); resolvePaymentProvider reads the rules
// table with the service role. Selection policy:
//   1. An explicit, known provider requested by the client wins (a buyer who
//      chose "MoMo" vs "Card" should get it).
//   2. Otherwise the highest-priority active rule matching the order's
//      currency (and country, when supplied) decides.
//   3. Otherwise fall back to FALLBACK_PROVIDER ("paystack").
// Rules never override an explicit valid choice — they supply the default.
import { createAdminClient } from "@/lib/supabase/admin"
import type { PaymentProvider } from "@/lib/payments"

export const KNOWN_PROVIDERS: PaymentProvider[] = ["paystack", "flutterwave", "manual", "momo"]
const FALLBACK_PROVIDER: PaymentProvider = "paystack"

export interface RoutingRule {
  priority: number | null
  country_code: string | null
  currency: string | null
  provider: string
  fallback_provider: string | null
  is_active: boolean | null
}

export interface RoutingContext {
  currency: string
  countryCode?: string | null
}

function isKnown(p: string | null | undefined): p is PaymentProvider {
  return !!p && (KNOWN_PROVIDERS as string[]).includes(p)
}

/**
 * Pure: pick the provider (+ fallback) for a currency/country from a set of
 * routing rules. A NULL country_code/currency on a rule means "any". Lower
 * `priority` wins; nulls sort last. Returns null when nothing matches.
 */
export function matchRoutingRule(
  rules: RoutingRule[],
  ctx: RoutingContext,
): { provider: string; fallback: string | null } | null {
  const candidates = rules
    .filter((r) => r.is_active !== false)
    .filter((r) => r.currency == null || r.currency.toUpperCase() === ctx.currency.toUpperCase())
    .filter((r) => r.country_code == null || (ctx.countryCode != null && r.country_code.toUpperCase() === ctx.countryCode.toUpperCase()))
    .sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER))

  const top = candidates[0]
  return top ? { provider: top.provider, fallback: top.fallback_provider } : null
}

/**
 * Resolve the provider to charge with. `requested` (from the client) wins when
 * it is a known provider; otherwise routing rules / fallback decide. Falls back
 * gracefully (to the requested value or paystack) on any lookup error so
 * checkout never breaks because the rules table is unreadable.
 */
export async function resolvePaymentProvider(
  ctx: RoutingContext & { requested?: string | null },
): Promise<PaymentProvider> {
  if (isKnown(ctx.requested)) return ctx.requested

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("payment_routing_rules")
      .select("priority, country_code, currency, provider, fallback_provider, is_active")
      .eq("is_active", true)

    if (error || !data) return FALLBACK_PROVIDER

    const matched = matchRoutingRule(data as RoutingRule[], ctx)
    if (matched && isKnown(matched.provider)) return matched.provider
    if (matched && isKnown(matched.fallback)) return matched.fallback
    return FALLBACK_PROVIDER
  } catch {
    return FALLBACK_PROVIDER
  }
}
