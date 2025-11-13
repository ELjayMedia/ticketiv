import { MOCK_EVENTS } from "./mock-data"

export interface PricingInput {
  eventId: string
  quantity: number
}

export interface PricingBreakdown {
  subtotal: number
  fees: number
  total: number
  currency: string
}

const PLATFORM_FEE_RATE = 0.1
const CURRENCY = "USD"

export function calculatePricing({ eventId, quantity }: PricingInput): PricingBreakdown {
  const event = MOCK_EVENTS.find((item) => item.id === eventId)
  const price = event?.price ?? 0
  const subtotal = price * Math.max(1, quantity)
  const fees = Number.parseFloat((subtotal * PLATFORM_FEE_RATE).toFixed(2))
  const total = Number.parseFloat((subtotal + fees).toFixed(2))

  return {
    subtotal,
    fees,
    total,
    currency: CURRENCY,
  }
}

export function formatCurrency(value: number, currency: string = CURRENCY) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}
