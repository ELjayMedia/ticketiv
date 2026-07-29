export type CheckoutPaymentProvider = "paystack" | "momo"

const CHECKOUT_PROVIDERS: CheckoutPaymentProvider[] = ["paystack", "momo"]

function isCheckoutProvider(value: string): value is CheckoutPaymentProvider {
  return CHECKOUT_PROVIDERS.includes(value as CheckoutPaymentProvider)
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
