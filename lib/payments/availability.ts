import "server-only"

import { getPaystackSettings } from "@/lib/payments/paystack-config"
import { createAdminClient } from "@/lib/supabase/admin"

export type CheckoutPaymentProvider = "paystack" | "momo"

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

export function isMomoOperational() {
  return Boolean(
    process.env.MOMO_COLLECTIONS_PRIMARY_KEY?.trim() &&
      process.env.MOMO_API_USER?.trim() &&
      process.env.MOMO_API_KEY?.trim(),
  )
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

export async function getOrganizerPaymentProviderOptions(): Promise<OrganizerPaymentProviderOption[]> {
  const settings = await getProviderSettingMap()

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
  const momoHasCredentials = isMomoOperational()

  return [
    {
      ...methodFor("paystack"),
      enabled: paystackEnabled,
      operational: paystackEnabled && paystackHasCredentials,
      warning:
        paystackEnabled && !paystackHasCredentials
          ? "Paystack is enabled but its production credentials are incomplete."
          : !paystackEnabled
            ? "Paystack is disabled by Ticketiv platform administration."
            : null,
    },
    {
      ...methodFor("momo"),
      enabled: momoEnabled,
      operational: momoEnabled && momoHasCredentials,
      warning:
        momoEnabled && !momoHasCredentials
          ? "MTN MoMo is enabled but its Collections credentials are incomplete."
          : !momoEnabled
            ? "MTN MoMo is disabled by Ticketiv platform administration."
            : null,
    },
  ]
}

export async function getOperationalPaymentProviders(): Promise<CheckoutPaymentProvider[]> {
  const options = await getOrganizerPaymentProviderOptions()
  return options.filter((option) => option.enabled && option.operational).map((option) => option.id)
}

function effectiveFromEventLists(
  operational: CheckoutPaymentProvider[],
  eventProviderLists: string[][],
) {
  let effective = [...operational]

  for (const rawList of eventProviderLists) {
    const eventLock = rawList.map(String).filter(isCheckoutProvider)
    if (eventLock.length === 0) continue
    effective = effective.filter((provider) => eventLock.includes(provider))
  }

  return effective
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

  const operational = await getOperationalPaymentProviders()
  const eventList = Array.isArray(event.payment_providers)
    ? event.payment_providers.map(String)
    : []

  return effectiveFromEventLists(operational, [eventList])
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
    .select("ticket_types(events(id, payment_providers))")
    .eq("order_id", orderId)

  if (error) {
    console.error("[payments] Failed to validate order payment method", error)
    throw new Error("Unable to verify this payment method right now.")
  }

  const eventLists = new Map<string, string[]>()
  for (const row of (data ?? []) as any[]) {
    const event = row?.ticket_types?.events
    if (!event?.id) continue
    eventLists.set(
      String(event.id),
      Array.isArray(event.payment_providers) ? event.payment_providers.map(String) : [],
    )
  }

  if (eventLists.size === 0) {
    throw new Error("Unable to verify this payment method right now.")
  }

  const operational = await getOperationalPaymentProviders()
  const effective = effectiveFromEventLists(operational, [...eventLists.values()])

  if (!effective.includes(requested)) {
    throw new Error("This event does not accept that payment method. Choose another option.")
  }

  return requested
}
