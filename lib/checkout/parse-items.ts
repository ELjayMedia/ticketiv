// Strict parsing of checkout line items from an untrusted request body.
//
// Every order-creation entry point (the checkout server action, the event
// checkout API and the legacy /api/orders API) runs this before the order RPC
// so they all reject the same bad input. The RPC still enforces stock, sales
// windows and per-buyer limits; this only guarantees well-formed input.

export const MAX_CHECKOUT_LINE_ITEMS = 20
export const MAX_CHECKOUT_ITEM_QUANTITY = 50

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ParsedCheckoutItem = { ticketTypeId: string; quantity: number }

export type ParseCheckoutItemsResult =
  | { ok: true; items: ParsedCheckoutItem[] }
  | { ok: false; error: string }

/**
 * @param raw     the untrusted items array
 * @param idField the key that carries the ticket type id in this caller's shape
 */
export function parseCheckoutItems(
  raw: unknown,
  idField: "ticket_type_id" | "ticketTypeId" = "ticketTypeId",
): ParseCheckoutItemsResult {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "Select at least one ticket" }
  if (raw.length > MAX_CHECKOUT_LINE_ITEMS) return { ok: false, error: "Too many line items" }

  // Merge repeated ticket types so one type cannot dodge the quantity cap by
  // being split across several lines.
  const quantities = new Map<string, number>()
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return { ok: false, error: "Select valid tickets" }
    const record = entry as Record<string, unknown>
    const ticketTypeId = typeof record[idField] === "string" ? (record[idField] as string).trim() : ""
    const quantity = typeof record.quantity === "number" ? record.quantity : Number(record.quantity)

    if (!UUID_RE.test(ticketTypeId)) return { ok: false, error: "Select valid tickets" }
    if (!Number.isInteger(quantity) || quantity < 1) return { ok: false, error: "Select valid tickets" }

    const merged = (quantities.get(ticketTypeId) ?? 0) + quantity
    if (merged > MAX_CHECKOUT_ITEM_QUANTITY) {
      return { ok: false, error: `You can buy at most ${MAX_CHECKOUT_ITEM_QUANTITY} of one ticket type per order` }
    }
    quantities.set(ticketTypeId, merged)
  }

  return {
    ok: true,
    items: Array.from(quantities, ([ticketTypeId, quantity]) => ({ ticketTypeId, quantity })),
  }
}
