import {
  CHECKOUT_PROVIDERS,
  isCheckoutProvider,
  PAYMENT_PROVIDER_CATALOG,
  type CheckoutPaymentProvider,
} from "@/lib/payments/providers/catalog"

export type { CheckoutPaymentProvider } from "@/lib/payments/providers/catalog"

// Currency support comes from the provider catalog, which mirrors the
// processor contracts used by the application.
const PROVIDER_CURRENCIES = {} as Record<CheckoutPaymentProvider, ReadonlySet<string>>
for (const id of CHECKOUT_PROVIDERS) {
  PROVIDER_CURRENCIES[id] = new Set<string>(PAYMENT_PROVIDER_CATALOG[id].currencies)
}

/**
 * MoMo Collections `requesttopay` takes an amount in whole SZL — the API has no
 * minor unit. Orders are integer cents, and buyer totals routinely are not a
 * round major unit: `fn_compute_order_money` adds a rounded basis-point platform
 * fee, so a SZL 99.00 ticket with a 6.5% buyer-paid fee bills 10,544 cents.
 *
 * Rounding that to the nearest whole SZL would charge an amount the order does
 * not record, leaving `orders.total_cents` disagreeing with what the provider
 * actually settled — which is exactly what the reconciliation checks exist to
 * catch. MoMo is therefore unavailable for such an order rather than silently
 * mispriced.
 */
export function momoAcceptsAmountCents(totalCents: number): boolean {
  return Number.isInteger(totalCents) && totalCents > 0 && totalCents % 100 === 0
}

/** Same rule for any catalog provider marked `wholeMajorUnitsOnly` (MoMo today). */
export function providerAcceptsAmountCents(provider: CheckoutPaymentProvider, totalCents: number): boolean {
  return !PAYMENT_PROVIDER_CATALOG[provider].wholeMajorUnitsOnly || momoAcceptsAmountCents(totalCents)
}

export interface MomoEnvInput {
  collectionsPrimaryKey?: string
  apiUser?: string
  apiKey?: string
  baseUrl?: string
  environment?: string
  /** "production" | "preview" | "development" — from DEPLOYMENT_ENV / NODE_ENV. */
  deploymentEnv?: string
}

export interface MomoConfigState {
  operational: boolean
  problems: string[]
}

const MOMO_SANDBOX_HOST = "sandbox.momodeveloper.mtn.com"
const MOMO_SANDBOX_ENVIRONMENT = "sandbox"
const MOMO_ESWATINI_ENVIRONMENT = "mtnswaziland"

function looksLikeSandboxUrl(url: string) {
  return url.toLowerCase().includes(MOMO_SANDBOX_HOST)
}

/**
 * Decide whether MoMo is safe to offer to real buyers.
 *
 * The credentials alone are not enough, and treating them as enough is a live
 * money hazard: `lib/payments/momo.ts` defaults `MOMO_BASE_URL` to the sandbox
 * host and `MOMO_ENVIRONMENT` to "sandbox". A production deployment that sets
 * only the three credential vars therefore presents MoMo at checkout and sends
 * real buyers to the MTN sandbox, where no money moves.
 *
 * So both the target environment and the base URL must be set explicitly, must
 * agree with each other, and must not be the sandbox in production.
 */
export function evaluateMomoConfig(input: MomoEnvInput): MomoConfigState {
  const problems: string[] = []

  const missingCredentials = (
    [
      ["MOMO_COLLECTIONS_PRIMARY_KEY", input.collectionsPrimaryKey],
      ["MOMO_API_USER", input.apiUser],
      ["MOMO_API_KEY", input.apiKey],
    ] as const
  )
    .filter(([, value]) => !value?.trim())
    .map(([name]) => name)

  if (missingCredentials.length > 0) {
    problems.push(`Missing Collections credentials: ${missingCredentials.join(", ")}.`)
  }

  const environment = input.environment?.trim() ?? ""
  const baseUrl = input.baseUrl?.trim() ?? ""

  if (!environment) problems.push("MOMO_ENVIRONMENT is not set — it silently defaults to the sandbox.")
  if (!baseUrl) problems.push("MOMO_BASE_URL is not set — it silently defaults to the sandbox host.")

  const environmentIsSandbox = environment === MOMO_SANDBOX_ENVIRONMENT
  const urlIsSandbox = Boolean(baseUrl) && looksLikeSandboxUrl(baseUrl)

  if (environment && baseUrl && environmentIsSandbox !== urlIsSandbox) {
    problems.push(
      `MOMO_ENVIRONMENT ("${environment}") and MOMO_BASE_URL disagree about sandbox vs production.`,
    )
  }

  if (input.deploymentEnv === "production" && (environmentIsSandbox || urlIsSandbox)) {
    problems.push("This is a production deployment but MoMo is pointed at the MTN sandbox.")
  }

  if (
    environment &&
    !environmentIsSandbox &&
    environment !== MOMO_ESWATINI_ENVIRONMENT
  ) {
    problems.push(
      `MOMO_ENVIRONMENT must be "${MOMO_ESWATINI_ENVIRONMENT}" for MTN Eswatini production.`,
    )
  }

  return { operational: problems.length === 0, problems }
}

export function providerSupportsCurrencies(
  provider: CheckoutPaymentProvider,
  currencies: string[],
): boolean {
  const required = [...new Set(currencies.map((currency) => currency.trim().toUpperCase()).filter(Boolean))]
  return required.length === 0 || required.every((currency) => PROVIDER_CURRENCIES[provider].has(currency))
}

export function filterProvidersByCurrencies(
  providers: CheckoutPaymentProvider[],
  currencies: string[],
): CheckoutPaymentProvider[] {
  return providers.filter((provider) => providerSupportsCurrencies(provider, currencies))
}

/**
 * Apply one or more event-level allow-lists to the currently operational
 * providers. An empty event list means "all operational methods". A non-empty
 * list containing only unsupported/unavailable providers intentionally resolves
 * to no methods rather than accidentally removing the organizer lock.
 */
export function resolveEffectivePaymentProviders(
  operational: CheckoutPaymentProvider[],
  eventProviderLists: string[][],
): CheckoutPaymentProvider[] {
  let effective = [...operational]

  for (const rawList of eventProviderLists) {
    if (rawList.length === 0) continue
    const eventLock = rawList.map(String).filter(isCheckoutProvider)
    effective = effective.filter((provider) => eventLock.includes(provider))
  }

  return effective
}

/**
 * Clean an organiser-supplied payment-method list for a ticket type or event:
 * known checkout providers only, no duplicates, catalog order. An empty list
 * means "every method the event accepts" (the default).
 */
export function parsePaymentProviderList(
  raw: unknown,
): { ok: true; providers: CheckoutPaymentProvider[] } | { ok: false; error: string } {
  if (raw == null) return { ok: true, providers: [] }
  if (!Array.isArray(raw)) return { ok: false, error: "Payment methods must be a list" }
  const unknown = raw.filter((value) => !isCheckoutProvider(value))
  if (unknown.length > 0) return { ok: false, error: "Choose payment methods Ticketiv supports" }
  const chosen = new Set(raw as CheckoutPaymentProvider[])
  return { ok: true, providers: CHECKOUT_PROVIDERS.filter((provider) => chosen.has(provider)) }
}

export interface TicketTypePaymentRule {
  id: string
  name?: string | null
  currency: string | null
  /** Empty or null = every method the event accepts. */
  payment_providers: string[] | null
}

/**
 * Methods a buyer can use for one ticket type: operational for its currency,
 * allowed by the event, and allowed by the ticket type's own list.
 */
export function resolveTicketTypePaymentProviders(
  operational: CheckoutPaymentProvider[],
  eventProviders: string[],
  ticket: TicketTypePaymentRule,
): CheckoutPaymentProvider[] {
  const forCurrency = filterProvidersByCurrencies(operational, ticket.currency ? [ticket.currency] : [])
  return resolveEffectivePaymentProviders(forCurrency, [eventProviders, ticket.payment_providers ?? []])
}

/**
 * Methods that can pay for a whole cart: every ticket type in it must accept
 * the method. Empty when the cart mixes tickets with no method in common.
 */
export function resolveCartPaymentProviders(
  operational: CheckoutPaymentProvider[],
  eventProviders: string[],
  tickets: ReadonlyArray<TicketTypePaymentRule>,
): CheckoutPaymentProvider[] {
  if (tickets.length === 0) return []
  let effective = resolveEffectivePaymentProviders(operational, [eventProviders])
  for (const ticket of tickets) {
    const allowed = resolveTicketTypePaymentProviders(operational, eventProviders, ticket)
    effective = effective.filter((provider) => allowed.includes(provider))
  }
  return effective
}

/**
 * Why an organiser's per-ticket method list can't be saved, or null when it
 * can. Methods must take the ticket's currency and, when the event itself is
 * limited to some methods, be among them.
 */
export function ticketPaymentMethodsProblem(
  providers: ReadonlyArray<CheckoutPaymentProvider>,
  eventProviders: ReadonlyArray<string>,
  currency: string | null,
): string | null {
  if (providers.length === 0) return null
  const wrongCurrency = currency ? providers.filter((p) => !providerSupportsCurrencies(p, [currency])) : []
  if (wrongCurrency.length > 0) {
    return `${wrongCurrency.map((p) => PAYMENT_PROVIDER_CATALOG[p].label).join(", ")} can't take ${currency} payments. Pick a method that works with this ticket's currency.`
  }
  const eventLock = eventProviders.filter(isCheckoutProvider)
  const outsideEvent = eventLock.length > 0 ? providers.filter((p) => !eventLock.includes(p)) : []
  if (outsideEvent.length > 0) {
    return `This event doesn't accept ${outsideEvent.map((p) => PAYMENT_PROVIDER_CATALOG[p].label).join(", ")}. Add it under Payments & policies first, or pick another method.`
  }
  return null
}
