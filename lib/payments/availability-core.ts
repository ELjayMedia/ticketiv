export type CheckoutPaymentProvider = "paystack" | "momo"

const CHECKOUT_PROVIDERS: CheckoutPaymentProvider[] = ["paystack", "momo"]

// Keep this aligned with the processor contracts used by the application.
// Paystack's published list does not include SZL; the MoMo adapter is the
// Eswatini Collections integration and sends SZL explicitly.
const PROVIDER_CURRENCIES: Record<CheckoutPaymentProvider, ReadonlySet<string>> = {
  paystack: new Set(["GHS", "KES", "NGN", "USD", "XOF", "ZAR"]),
  momo: new Set(["SZL"]),
}

function isCheckoutProvider(value: string): value is CheckoutPaymentProvider {
  return CHECKOUT_PROVIDERS.includes(value as CheckoutPaymentProvider)
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
