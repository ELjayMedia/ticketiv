import type { TicketTypeRecord } from "@/types"

export interface FeeConfiguration {
  platformPercentFee: number
  platformFixedFee: number
  processingPercentFee: number
  processingFixedFee: number
  passFeesToBuyer: boolean
  currency: string
}

export interface LineItemPricingBreakdown {
  ticketTypeId: string
  quantity: number
  unitPrice: number
  subtotal: number
  fees: number
  total: number
}

export interface OrderPricingBreakdown {
  subtotal: number
  fees: number
  total: number
  currency: string
  lineItems: LineItemPricingBreakdown[]
}

export interface OrderPricingInput {
  items: Array<{ ticketType: TicketTypeRecord; quantity: number }>
  currency?: string
  feeConfiguration?: Partial<FeeConfiguration>
}

const DEFAULT_FEE_CONFIGURATION: FeeConfiguration = {
  platformPercentFee: 0.065,
  platformFixedFee: 1.79,
  processingPercentFee: 0.029,
  processingFixedFee: 0.3,
  passFeesToBuyer: true,
  currency: "USD",
}

function resolveConfiguration(overrides?: Partial<FeeConfiguration>): FeeConfiguration {
  return { ...DEFAULT_FEE_CONFIGURATION, ...(overrides ?? {}) }
}

function calculateFees(amount: number, config: FeeConfiguration) {
  const platformFees = amount * config.platformPercentFee + config.platformFixedFee
  const processingFees = amount * config.processingPercentFee + config.processingFixedFee
  return roundCurrency(platformFees + processingFees)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function calculateLineItemPricing(
  ticketType: TicketTypeRecord,
  quantity: number,
  configOverrides?: Partial<FeeConfiguration>,
): LineItemPricingBreakdown {
  const config = resolveConfiguration({ currency: ticketType.currency, ...configOverrides })
  const safeQuantity = Math.max(1, quantity)
  const unitPrice = ticketType.price
  const subtotal = roundCurrency(unitPrice * safeQuantity)
  const absorbFees = ticketType.absorb_fees ?? !config.passFeesToBuyer
  const fees = absorbFees ? 0 : calculateFees(subtotal, config)
  const total = roundCurrency(subtotal + fees)

  return {
    ticketTypeId: ticketType.id,
    quantity: safeQuantity,
    unitPrice,
    subtotal,
    fees,
    total,
  }
}

export function calculateOrderPricing({ items, currency, feeConfiguration }: OrderPricingInput): OrderPricingBreakdown {
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      fees: 0,
      total: 0,
      currency: currency ?? DEFAULT_FEE_CONFIGURATION.currency,
      lineItems: [],
    }
  }

  const config = resolveConfiguration({ currency: currency ?? items[0]?.ticketType.currency, ...feeConfiguration })
  const lineItems = items.map(({ ticketType, quantity }) => calculateLineItemPricing(ticketType, quantity, config))
  const subtotal = roundCurrency(lineItems.reduce((sum, line) => sum + line.subtotal, 0))
  const fees = roundCurrency(lineItems.reduce((sum, line) => sum + line.fees, 0))
  const total = roundCurrency(subtotal + fees)

  return {
    subtotal,
    fees,
    total,
    currency: config.currency,
    lineItems,
  }
}

export function formatCurrency(value: number, currency: string = DEFAULT_FEE_CONFIGURATION.currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value)
}
