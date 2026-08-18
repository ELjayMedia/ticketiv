export type CheckoutPaymentProvider = "paystack" | "momo" | "deltapay"

const CHECKOUT_PROVIDERS: CheckoutPaymentProvider[] = ["paystack", "momo", "deltapay"]

// Keep this aligned with the processor contracts used by the application.
// Paystack's published list does not include SZL; MoMo and DeltaPay are the
// native Eswatini rails. DeltaPay Hosted Checkout accepts decimal SZL amounts.
const PROVIDER_CURRENCIES: Record<CheckoutPaymentProvider, ReadonlySet<string>> = {
  paystack: new Set(["GHS", "KES", "NGN", "USD", "XOF", "ZAR"]),
  momo: new Set(["SZL"]),
  deltapay: new Set(["SZL"]),
}

function isCheckoutProvider(value: string): value is CheckoutPaymentProvider {
  return CHECKOUT_PROVIDERS.includes(value as CheckoutPaymentProvider)
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

export interface MomoEnvInput {
  collectionsPrimaryKey?: string
  apiUser?: string
  apiKey?: string
  baseUrl?: string
  environment?: string
  /** "production" | "preview" | "development" — from VERCEL_ENV / NODE_ENV. */
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
