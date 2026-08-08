import "server-only"

import {
  evaluateMomoConfig,
  filterProvidersByCurrencies,
  momoAcceptsAmountCents,
  providerSupportsCurrencies,
  resolveEffectivePaymentProviders,
  type CheckoutPaymentProvider,
  type MomoConfigState,
} from "@/lib/payments/availability-core"
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
  operational: boolean
  warning: string | null
}

const METHOD_COPY: Record<CheckoutPaymentProvider, Omit<CheckoutPaymentMethod, "id">> = {
  paystack: {
    label: "Card / bank payment",
    sub: "Secure hosted checkout powered by Paystack",
    type: "card",
  },
  momo: {
    label: "MTN MoMo",
    sub: "Approve the payment on your MTN mobile wallet",
    type: "mobile_money",
  },
}

const CHECKOUT_PROVIDERS: CheckoutPaymentProvider[] = ["paystack", "momo"]

function isCheckoutProvider(value: string): value is CheckoutPaymentProvider {
  return CHECKOUT_PROVIDERS.includes(value as CheckoutPaymentProvider)
}

function methodFor(id: CheckoutPaymentProvider): CheckoutPaymentMethod {
  return { id, ...METHOD_COPY[id] }
}

export function getMomoConfigState(): MomoConfigState {
  return evaluateMomoConfig({
    collectionsPrimaryKey: process.env.MOMO_COLLECTIONS_PRIMARY_KEY,
    apiUser: process.env.MOMO_API_USER,
    apiKey: process.env.MOMO_API_KEY,
    baseUrl: process.env.MOMO_BASE_URL,
    environment: process.env.MOMO_ENVIRONMENT,
    deploymentEnv: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
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

  const paystackEnabled = settings.has("paystack")
    ? settings.get("paystack") === true
    : paystackHasCredentials
  const momoEnabled = settings.has("momo") ? settings.get("momo") === true : true
  const momoConfig = getMomoConfigState()
  const momoHasCredentials = momoConfig.operational
  const paystackSupportsEvent = currencyStateAvailable && providerSupportsCurrencies("paystack", eventCurrencies)
  const momoSupportsEvent = currencyStateAvailable && providerSupportsCurrencies("momo", eventCurrencies)
  const currencyLabel = eventCurrencies.join(", ")

  return [
    {
      ...methodFor("paystack"),
      enabled: paystackEnabled,
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
  ]
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

export async function getEffectivePaymentProvidersForEvent(
  eventId: string,
): Promise<CheckoutPaymentProvider[]> {
  const admin = createAdminClient()
  const { data: event, error } = await admin
    .from("events")
    .select("id, payment_providers")
    .eq("id", eventId)
    .maybeSingle()

  if (error) {
    console.error("[payments] Failed to load event payment methods", error)
    return []
  }
  if (!event) return []

  const currencies = await getEventCurrencies(eventId)
  if (currencies === null) return []
  const operational = await getOperationalPaymentProviders(currencies)
  const eventList = Array.isArray(event.payment_providers)
    ? event.payment_providers.map(String)
    : []

  return resolveEffectivePaymentProviders(operational, [eventList])
}

export async function getEffectivePaymentMethodsForEvent(
  eventId: string,
): Promise<CheckoutPaymentMethod[]> {
  const providers = await getEffectivePaymentProvidersForEvent(eventId)
  return providers.map(methodFor)
}

export async function assertPaymentProviderAvailableForEvent(
  eventId: string,
  requested: string,
): Promise<CheckoutPaymentProvider> {
  if (!isCheckoutProvider(requested)) {
    throw new Error("This event does not accept that payment method. Choose another option.")
  }

  const effective = await getEffectivePaymentProvidersForEvent(eventId)
  if (!effective.includes(requested)) {
    throw new Error("This event does not accept that payment method. Choose another option.")
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
    .select("ticket_types(currency, events(id, payment_providers))")
    .eq("order_id", orderId)

  if (error) {
    console.error("[payments] Failed to validate order payment method", error)
    throw new Error("Unable to verify this payment method right now.")
  }

  const eventLists = new Map<string, string[]>()
  const currencies: string[] = []
  for (const row of (data ?? []) as any[]) {
    const event = row?.ticket_types?.events
    if (!event?.id) continue
    eventLists.set(
      String(event.id),
      Array.isArray(event.payment_providers) ? event.payment_providers.map(String) : [],
    )
    if (row?.ticket_types?.currency) currencies.push(String(row.ticket_types.currency))
  }

  if (eventLists.size === 0) {
    throw new Error("Unable to verify this payment method right now.")
  }

  const operational = await getOperationalPaymentProviders(currencies)
  const effective = resolveEffectivePaymentProviders(operational, [...eventLists.values()])

  if (!effective.includes(requested)) {
    throw new Error("This event does not accept that payment method. Choose another option.")
  }

  return requested
}
