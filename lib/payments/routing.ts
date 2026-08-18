// Provider selection via payment_routing_rules (TICK-179).
//
// The matcher is pure (unit-tested); resolvePaymentProvider reads the rules
// table with the service role. Selection policy:
//   1. An explicit, known provider requested by the client wins (a buyer who
//      chose "MoMo" vs "Card" should get it).
//   2. Otherwise the highest-priority active rule matching the order's
//      currency (and country, when supplied) decides.
// Rules never override an explicit valid choice — they supply the default.
// An unmatched request is a controlled failure; there is no unconditional
// provider fallback because that can select a disabled or incompatible rail.
import { createAdminClient } from "@/lib/supabase/admin"
import type { PaymentProvider } from "@/lib/payments"
import {
  createPaymentChannelUnavailableError,
  PaymentChannelUnavailableError,
  reportPaymentChannelUnavailable,
} from "@/lib/payments/errors"

export const KNOWN_PROVIDERS: PaymentProvider[] = ["paystack", "flutterwave", "manual", "momo", "deltapay"]

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
  /**
   * Event-level lock. When non-empty, only these providers may be used for the
   * order; an empty/absent list means no lock (any enabled provider).
   */
  allowedProviders?: string[] | null
}

/** Normalise an allow-list to known providers. Empty result = no constraint. */
export function normaliseAllowed(allowed: string[] | null | undefined): PaymentProvider[] {
  if (!allowed || allowed.length === 0) return []
  return allowed.filter(isKnown)
}

/** Thrown when an event's provider lock leaves no usable option for a request. */
export class ProviderNotAllowedError extends Error {
  constructor(public allowed: string[]) {
    super(`This event only accepts: ${allowed.join(", ")}`)
    this.name = "ProviderNotAllowedError"
  }
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
  const allowed = normaliseAllowed(ctx.allowedProviders)
  const permits = (provider: string | null) =>
    isKnown(provider) && (allowed.length === 0 || allowed.includes(provider))

  const candidates = rules
    .filter((r) => r.is_active !== false)
    .filter((r) => r.currency == null || r.currency.toUpperCase() === ctx.currency.toUpperCase())
    .filter((r) => r.country_code == null || (ctx.countryCode != null && r.country_code.toUpperCase() === ctx.countryCode.toUpperCase()))
    .filter((r) => permits(r.provider) || permits(r.fallback_provider))
    .sort((a, b) => {
      const priority = (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER)
      if (priority !== 0) return priority

      const specificityA = Number(a.currency != null) + Number(a.country_code != null)
      const specificityB = Number(b.currency != null) + Number(b.country_code != null)
      if (specificityA !== specificityB) return specificityB - specificityA

      const provider = a.provider.localeCompare(b.provider)
      if (provider !== 0) return provider
      return String(a.fallback_provider ?? "").localeCompare(String(b.fallback_provider ?? ""))
    })

  const top = candidates[0]
  return top ? { provider: top.provider, fallback: top.fallback_provider } : null
}

/**
 * Pure provider selection after routing rules have been loaded. Throws a
 * controlled error when no configured route survives the event lock.
 */
export function selectPaymentProvider(
  rules: RoutingRule[],
  ctx: RoutingContext & { requested?: string | null },
): PaymentProvider {
  const allowed = normaliseAllowed(ctx.allowedProviders)
  const permits = (p: PaymentProvider) => allowed.length === 0 || allowed.includes(p)

  // An explicit, known client choice wins — but only if the event lock permits
  // it. A disallowed explicit choice is a hard error (don't silently switch the
  // rail the buyer picked).
  if (isKnown(ctx.requested)) {
    if (permits(ctx.requested)) return ctx.requested
    throw new ProviderNotAllowedError(allowed)
  }

  const matched = matchRoutingRule(rules, ctx)
  if (matched && isKnown(matched.provider) && permits(matched.provider)) return matched.provider
  if (matched && isKnown(matched.fallback) && permits(matched.fallback)) return matched.fallback

  throw createPaymentChannelUnavailableError("no_matching_route", {
    currency: ctx.currency.toUpperCase(),
    countryCode: ctx.countryCode?.toUpperCase() ?? null,
    allowedProviders: allowed,
    activeRuleCount: rules.filter((rule) => rule.is_active !== false).length,
  })
}

/** Load active rules and resolve the provider to charge with. */
export async function resolvePaymentProvider(
  ctx: RoutingContext & { requested?: string | null },
): Promise<PaymentProvider> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("payment_routing_rules")
      .select("priority, country_code, currency, provider, fallback_provider, is_active")
      .eq("is_active", true)

    if (error) {
      throw createPaymentChannelUnavailableError("routing_configuration_unavailable", {
        currency: ctx.currency.toUpperCase(),
        databaseCode: error.code ?? null,
      })
    }

    return selectPaymentProvider((data ?? []) as RoutingRule[], ctx)
  } catch (error) {
    if (error instanceof ProviderNotAllowedError) throw error
    const controlled =
      error instanceof PaymentChannelUnavailableError
        ? error
        : createPaymentChannelUnavailableError("routing_configuration_unavailable", {
            currency: ctx.currency.toUpperCase(),
          })
    reportPaymentChannelUnavailable(controlled)
    throw controlled
  }
}
