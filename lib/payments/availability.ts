import "server-only"

import {
  evaluateMomoConfig,
  filterProvidersByCurrencies,
  providerAcceptsAmountCents,
  providerSupportsCurrencies,
  resolveCartPaymentProviders,
  resolveEffectivePaymentProviders,
  resolveTicketTypePaymentProviders,
  type CheckoutPaymentProvider,
  type TicketTypePaymentRule,
  type MomoConfigState,
} from "@/lib/payments/availability-core"
import { getDeltaPayConfig } from "@/lib/payments/deltapay"
import { isCheckoutProvider, PAYMENT_PROVIDER_CATALOG, paymentProvider } from "@/lib/payments/providers/catalog"
import { getPaystackSettings } from "@/lib/payments/paystack-config"
import { createAdminClient } from "@/lib/supabase/admin"

export type { CheckoutPaymentProvider } from "@/lib/payments/availability-core"

export interface CheckoutPaymentMethod {
  id: CheckoutPaymentProvider
  label: string
  sub: string
  type: "card" | "mobile_money"
}

export interface OrganizerPaymentProviderOption extends CheckoutPaymentMethod {
  enabled: boolean
  /** Switched on and credentials complete, whatever the event's currency. */
  configured: boolean
  operational: boolean
  warning: string | null
}

function methodFor(id: CheckoutPaymentProvider): CheckoutPaymentMethod {
  const { label, sub, type } = paymentProvider(id)
  return { id, label, sub, type }
}

export function getMomoConfigState(): MomoConfigState {
  return evaluateMomoConfig({
    collectionsPrimaryKey: process.env.MOMO_COLLECTIONS_PRIMARY_KEY,
    apiUser: process.env.MOMO_API_USER,
    apiKey: process.env.MOMO_API_KEY,
    baseUrl: process.env.MOMO_BASE_URL,
    environment: process.env.MOMO_ENVIRONMENT,
    deploymentEnv: process.env.DEPLOYMENT_ENV ?? process.env.NODE_ENV,
  })
}

export function isMomoOperational() {
  return getMomoConfigState().operational
}

async function getProviderSettingMap() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payment_provider_settings")
    .select("provider, is_enabled")

  if (error) {
    console.error("[payments] Failed to load provider settings", error)
    return new Map<string, boolean>()
  }

  return new Map((data ?? []).map((row) => [String(row.provider), Boolean(row.is_enabled)]))
}

async function getEventCurrencies(eventId: string): Promise<string[] | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("ticket_types")
    .select("currency")
    .eq("event_id", eventId)

  if (error) {
    console.error("[payments] Failed to load event currencies", { eventId, code: error.code })
    return null
  }

  return [...new Set((data ?? []).map((row) => String(row.currency ?? "").trim().toUpperCase()).filter(Boolean))]
}

export async function getOrganizerPaymentProviderOptions(
  eventId?: string,
): Promise<OrganizerPaymentProviderOption[]> {
  const settings = await getProviderSettingMap()
  const currencies = eventId ? await getEventCurrencies(eventId) : []
  const currencyStateAvailable = currencies !== null
  const eventCurrencies = currencies ?? []

  let paystackHasCredentials = false
  try {
    const paystack = await getPaystackSettings()
    paystackHasCredentials = Boolean(paystack.secretKey)
  } catch (error) {
    console.error("[payments] Paystack is not operational", error)
  }

  const deltaPayConfig = getDeltaPayConfig()
  const paystackEnabled = settings.has("paystack")
    ? settings.get("paystack") === true
    : paystackHasCredentials
  const momoEnabled = settings.has("momo") ? settings.get("momo") === true : true
  const deltaPayEnabled = settings.has("deltapay")
    ? settings.get("deltapay") === true
    : deltaPayConfig.operational
  const momoConfig = getMomoConfigState()
  const momoHasCredentials = momoConfig.operational
  const paystackSupportsEvent = currencyStateAvailable && providerSupportsCurrencies("paystack", eventCurrencies)
  const momoSupportsEvent = currencyStateAvailable && providerSupportsCurrencies("momo", eventCurrencies)
  const deltaPaySupportsEvent = currencyStateAvailable && providerSupportsCurrencies("deltapay", eventCurrencies)
  const currencyLabel = eventCurrencies.join(", ")

  const options: OrganizerPaymentProviderOption[] = [
    {
      ...methodFor("paystack"),
      enabled: paystackEnabled,
      configured: paystackEnabled && paystackHasCredentials,
      operational: paystackEnabled && paystackHasCredentials && paystackSupportsEvent,
      warning:
        paystackEnabled && !paystackHasCredentials
          ? "Paystack is enabled but its production credentials are incomplete."
          : !currencyStateAvailable
            ? "Ticketiv could not verify this event's currency, so Paystack is unavailable."
          : paystackEnabled && !paystackSupportsEvent
            ? `Paystack does not support this event's ${currencyLabel} currency. Use ZAR pricing or another operational method.`
          : !paystackEnabled
            ? "Paystack is disabled by Ticketiv platform administration."
            : null,
    },
    {
      ...methodFor("momo"),
      enabled: momoEnabled,
      configured: momoEnabled && momoHasCredentials,
      operational: momoEnabled && momoHasCredentials && momoSupportsEvent,
      warning:
        momoEnabled && !momoHasCredentials
          ? `MTN MoMo is enabled but not production-ready. ${momoConfig.problems.join(" ")}`
          : !currencyStateAvailable
            ? "Ticketiv could not verify this event's currency, so MTN MoMo is unavailable."
          : momoEnabled && !momoSupportsEvent
            ? `MTN MoMo does not support this event's ${currencyLabel} currency.`
          : !momoEnabled
            ? "MTN MoMo is disabled by Ticketiv platform administration."
            : null,
    },
    {
      ...methodFor("deltapay"),
      enabled: deltaPayEnabled,
      configured: deltaPayEnabled && deltaPayConfig.operational,
      operational: deltaPayEnabled && deltaPayConfig.operational && deltaPaySupportsEvent,
      warning:
        deltaPayEnabled && !deltaPayConfig.operational
          ? `DeltaPay is enabled but not ready. ${deltaPayConfig.problems.join(" ")}`
          : !currencyStateAvailable
            ? "Ticketiv could not verify this event's currency, so DeltaPay is unavailable."
          : deltaPayEnabled && !deltaPaySupportsEvent
            ? `DeltaPay Hosted Checkout only supports SZL for this integration; this event uses ${currencyLabel}.`
          : !deltaPayEnabled
            ? "DeltaPay is disabled by Ticketiv platform administration."
            : null,
    },
  ]
  return eventId ? applyOrgDefault(options, eventId) : options
}

/**
 * For an event's settings: methods outside the organisation's default
 * (TICK-394) can't be offered, so they show as unavailable with the reason.
 */
async function applyOrgDefault(options: OrganizerPaymentProviderOption[], eventId: string): Promise<OrganizerPaymentProviderOption[]> {
  const admin = createAdminClient()
  const { data } = await admin.from("events").select("organizations(payment_providers)").eq("id", eventId).maybeSingle()
  const raw = (data as { organizations?: { payment_providers?: unknown } | null } | null)?.organizations?.payment_providers
  const allowed = Array.isArray(raw) ? raw.map(String) : []
  if (allowed.length === 0) return options
  return options.map((option) =>
    allowed.includes(option.id)
      ? option
      : { ...option, configured: false, operational: false, warning: "Not in your organisation's default payment methods. Change it in Settings → Payment methods." },
  )
}

export async function getOperationalPaymentProviders(
  currencies: string[] = [],
): Promise<CheckoutPaymentProvider[]> {
  const options = await getOrganizerPaymentProviderOptions()
  const operational = options
    .filter((option) => option.enabled && option.operational)
    .map((option) => option.id)
  return filterProvidersByCurrencies(operational, currencies)
}

async function loadEventPaymentRules(eventId: string): Promise<{
  /** The organisation's default (TICK-394); empty = every available method. */
  orgProviders: string[]
  eventProviders: string[]
  tickets: TicketTypePaymentRule[]
} | null> {
  const admin = createAdminClient()
  const [{ data: event, error }, { data: tickets, error: ticketError }] = await Promise.all([
    admin.from("events").select("id, payment_providers, organizations(payment_providers)").eq("id", eventId).maybeSingle(),
    admin.from("ticket_types").select("id, name, currency, payment_providers").eq("event_id", eventId),
  ])

  if (error || ticketError) {
    console.error("[payments] Failed to load event payment methods", { eventId, code: (error ?? ticketError)?.code })
    return null
  }
  if (!event) return null

  const org = (event as { organizations?: { payment_providers?: unknown } | null }).organizations
  return {
    orgProviders: Array.isArray(org?.payment_providers) ? (org.payment_providers as unknown[]).map(String) : [],
    eventProviders: Array.isArray(event.payment_providers) ? event.payment_providers.map(String) : [],
    tickets: (tickets ?? []).map((ticket) => ({
      id: String(ticket.id),
      name: ticket.name ?? null,
      currency: ticket.currency ? String(ticket.currency).trim().toUpperCase() : null,
      payment_providers: Array.isArray(ticket.payment_providers) ? ticket.payment_providers.map(String) : [],
    })),
  }
}

/**
 * Methods buyers can use for this event. With `ticketTypeIds` (a cart), only
 * methods every one of those ticket types accepts. Without, the event-wide
 * set: methods that at least the event accepts, before any ticket type narrows
 * it.
 */
export async function getEffectivePaymentProvidersForEvent(
  eventId: string,
  ticketTypeIds?: ReadonlyArray<string>,
): Promise<CheckoutPaymentProvider[]> {
  const rules = await loadEventPaymentRules(eventId)
  if (!rules) return []
  // The organisation default narrows what the platform offers; events and ticket types narrow further.
  const operational = resolveEffectivePaymentProviders(await getOperationalPaymentProviders(), [rules.orgProviders])

  if (ticketTypeIds && ticketTypeIds.length > 0) {
    const wanted = new Set(ticketTypeIds)
    const cart = rules.tickets.filter((ticket) => wanted.has(ticket.id))
    if (cart.length !== wanted.size) return []
    return resolveCartPaymentProviders(operational, rules.eventProviders, cart)
  }

  const currencies = [...new Set(rules.tickets.map((ticket) => ticket.currency).filter(Boolean) as string[])]
  return resolveEffectivePaymentProviders(filterProvidersByCurrencies(operational, currencies), [rules.eventProviders])
}

export interface TicketTypePaymentMethods {
  id: string
  name: string
  /** True when the organiser picked specific methods for this ticket type. */
  restricted: boolean
  methods: CheckoutPaymentMethod[]
}

/** Per ticket type: which methods a buyer can use. Feeds checkout and publish readiness. */
export async function getTicketTypePaymentMethods(eventId: string): Promise<TicketTypePaymentMethods[]> {
  const rules = await loadEventPaymentRules(eventId)
  if (!rules) return []
  const operational = resolveEffectivePaymentProviders(await getOperationalPaymentProviders(), [rules.orgProviders])
  return rules.tickets.map((ticket) => ({
    id: ticket.id,
    name: ticket.name ?? "Ticket",
    restricted: (ticket.payment_providers ?? []).length > 0,
    methods: resolveTicketTypePaymentProviders(operational, rules.eventProviders, ticket).map(methodFor),
  }))
}

export async function getEffectivePaymentMethodsForEvent(
  eventId: string,
  ticketTypeIds?: ReadonlyArray<string>,
): Promise<CheckoutPaymentMethod[]> {
  const providers = await getEffectivePaymentProvidersForEvent(eventId, ticketTypeIds)
  return providers.map(methodFor)
}

export async function assertPaymentProviderAvailableForEvent(
  eventId: string,
  requested: string,
  ticketTypeIds?: ReadonlyArray<string>,
): Promise<CheckoutPaymentProvider> {
  if (!isCheckoutProvider(requested)) {
    throw new Error("This event does not accept that payment method. Choose another option.")
  }

  const effective = await getEffectivePaymentProvidersForEvent(eventId, ticketTypeIds)
  if (!effective.includes(requested)) {
    throw new Error("These tickets can't be paid for with that method. Choose another option.")
  }

  return requested
}

export async function assertPaymentProviderAvailableForOrder(
  orderId: string,
  requested: string,
): Promise<CheckoutPaymentProvider> {
  if (!isCheckoutProvider(requested)) {
    throw new Error("This event does not accept that payment method. Choose another option.")
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("order_items")
    .select("ticket_types(id, currency, payment_providers, events(id, payment_providers, organizations(id, payment_providers)))")
    .eq("order_id", orderId)

  if (error) {
    console.error("[payments] Failed to validate order payment method", error)
    throw new Error("Unable to verify this payment method right now.")
  }

  const orgLists = new Map<string, string[]>()
  const eventLists = new Map<string, string[]>()
  const ticketLists = new Map<string, string[]>()
  const currencies: string[] = []
  for (const row of (data ?? []) as any[]) {
    const ticket = row?.ticket_types
    const event = ticket?.events
    if (!event?.id) continue
    eventLists.set(
      String(event.id),
      Array.isArray(event.payment_providers) ? event.payment_providers.map(String) : [],
    )
    // The organisation's default (TICK-394) can never be bypassed by an event.
    if (event.organizations?.id) {
      orgLists.set(
        String(event.organizations.id),
        Array.isArray(event.organizations.payment_providers) ? event.organizations.payment_providers.map(String) : [],
      )
    }
    // Each ticket type may narrow the event's methods (empty = no narrowing).
    if (ticket?.id) {
      ticketLists.set(String(ticket.id), Array.isArray(ticket.payment_providers) ? ticket.payment_providers.map(String) : [])
    }
    if (ticket?.currency) currencies.push(String(ticket.currency))
  }

  if (eventLists.size === 0) {
    throw new Error("Unable to verify this payment method right now.")
  }

  const operational = await getOperationalPaymentProviders(currencies)
  let effective = resolveEffectivePaymentProviders(operational, [...orgLists.values(), ...eventLists.values(), ...ticketLists.values()])

  // Some rails (MoMo) cannot charge fractional major units; others (DeltaPay)
  // can, so the restriction comes from each provider's catalog entry rather
  // than being applied to every provider for a currency.
  if (effective.some((provider) => PAYMENT_PROVIDER_CATALOG[provider].wholeMajorUnitsOnly)) {
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("total_cents")
      .eq("id", orderId)
      .maybeSingle()
    if (orderError || !order) {
      console.error("[payments] Failed to verify order amount for whole-unit providers", orderError)
      throw new Error("Unable to verify this payment method right now.")
    }
    const totalCents = Number(order.total_cents)
    effective = effective.filter((provider) => providerAcceptsAmountCents(provider, totalCents))
  }

  if (!effective.includes(requested)) {
    throw new Error("This event does not accept that payment method. Choose another option.")
  }

  return requested
}
