// TICK-175 — this is the legacy client-side preview calculator (only
// formatCurrency is consumed in the app today). It operates on a decimal
// "price" + optional absorb_fees shape, which is NOT the DB TicketTypeRecord
// (that stores price_cents and has no absorb_fees column). Decoupled into a
// local interface so the dead preview math doesn't drag a wrong type onto the
// DB record. See docs/TYPE_BURNDOWN.md — the cents-vs-units semantics need a
// product decision before this module is wired to real checkout.
export interface PricingTicketType {
  id: string
  price: number
  currency: string
  absorb_fees?: boolean | null
}

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

export interface OrderAdjustment {
  type: "fee" | "discount" | "tax" | "credit"
  label: string
  amount: number
  priceRuleId?: string
}

export interface PricingPreview {
  subtotal: number
  adjustments: OrderAdjustment[]
  total: number
  currency: string
}

export interface PreviewOrderInput {
  items: Array<{ ticketType: PricingTicketType; quantity: number }>
  promoCode?: string
  eventId?: string
  currency?: string
  feeConfiguration?: Partial<FeeConfiguration>
}

export interface OrderPricingInput {
  items: Array<{ ticketType: PricingTicketType; quantity: number }>
  currency?: string
  feeConfiguration?: Partial<FeeConfiguration>
}

const DEFAULT_FEE_CONFIGURATION: FeeConfiguration = {
  platformPercentFee: 0.065,
  platformFixedFee: 1.79,
  processingPercentFee: 0.029,
  processingFixedFee: 0.3,
  passFeesToBuyer: true,
  currency: "SZL",
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
  ticketType: PricingTicketType,
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

/**
 * Preview order pricing with all adjustments (fees, discounts, taxes)
 * This maps to Supabase's order_adjustments and price_rules system
 */
export async function previewOrder({
  items,
  promoCode,
  eventId,
  currency,
  feeConfiguration,
}: PreviewOrderInput): Promise<PricingPreview> {
  const config = resolveConfiguration({ currency: currency ?? items[0]?.ticketType.currency, ...feeConfiguration })

  // Calculate base subtotal
  const subtotal = items.reduce((sum, { ticketType, quantity }) => {
    return sum + roundCurrency(ticketType.price * Math.max(1, quantity))
  }, 0)

  const adjustments: OrderAdjustment[] = []

  // Add platform and processing fees
  const platformFees = subtotal * config.platformPercentFee + config.platformFixedFee
  const processingFees = subtotal * config.processingPercentFee + config.processingFixedFee
  const totalFees = roundCurrency(platformFees + processingFees)

  if (totalFees > 0 && config.passFeesToBuyer) {
    adjustments.push({
      type: "fee",
      label: "Service Fee",
      amount: totalFees,
    })
  }

  // Apply promo code discount (if provided)
  if (promoCode) {
    // Promo preview/apply live in fn_preview_promo_code / fn_apply_promo_code_to_order.
    // For now, we'll add a placeholder
    const discountAmount = 0 // This would be calculated from validatePromoCode()
    if (discountAmount > 0) {
      adjustments.push({
        type: "discount",
        label: `Promo Code (${promoCode})`,
        amount: -discountAmount,
      })
    }
  }

  // Calculate final total
  const total = roundCurrency(subtotal + adjustments.reduce((sum, adj) => sum + adj.amount, 0))

  return {
    subtotal,
    adjustments,
    total,
    currency: config.currency,
  }
}

/**
 * Apply promo code and return discount adjustment
 * This integrates with price_rules and creates order_adjustments
 */
export async function applyPromoCodeAdjustment(
  code: string,
  eventId: string,
  subtotal: number,
): Promise<OrderAdjustment | null> {
  // This would integrate with fn_preview_promo_code / fn_apply_promo_code_to_order
  // and map to order_adjustments table
  // Implementation depends on Supabase RPC or direct validation

  return null // Placeholder
}

/**
 * Calculate all applicable fees for an order
 * Maps to order_adjustments with type='fee'
 */
export function calculateFeeAdjustments(subtotal: number, config: FeeConfiguration): OrderAdjustment[] {
  const adjustments: OrderAdjustment[] = []

  if (!config.passFeesToBuyer) {
    return adjustments
  }

  const platformFees = subtotal * config.platformPercentFee + config.platformFixedFee
  const processingFees = subtotal * config.processingPercentFee + config.processingFixedFee

  if (platformFees > 0) {
    adjustments.push({
      type: "fee",
      label: "Platform Fee",
      amount: roundCurrency(platformFees),
    })
  }

  if (processingFees > 0) {
    adjustments.push({
      type: "fee",
      label: "Processing Fee",
      amount: roundCurrency(processingFees),
    })
  }

  return adjustments
}
