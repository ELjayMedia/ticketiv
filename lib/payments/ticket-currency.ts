export const TICKET_CURRENCY_OPTIONS = [
  { value: "ZAR", label: "ZAR — Paystack card / bank" },
  { value: "SZL", label: "SZL — MTN MoMo" },
] as const

export type TicketCurrency = (typeof TICKET_CURRENCY_OPTIONS)[number]["value"]

export const DEFAULT_TICKET_CURRENCY: TicketCurrency = "ZAR"

const SUPPORTED_TICKET_CURRENCIES = new Set<string>(
  TICKET_CURRENCY_OPTIONS.map((option) => option.value),
)

export function normalizeTicketCurrency(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_TICKET_CURRENCY
  return value.trim().toUpperCase()
}

export function isSupportedTicketCurrency(value: unknown): value is TicketCurrency {
  return typeof value === "string" && SUPPORTED_TICKET_CURRENCIES.has(value)
}
