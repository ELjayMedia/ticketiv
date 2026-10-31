import { getEffectivePurchaseLimit } from "@/lib/tickets/purchase-limits";

/**
 * Multi-ticket-type cart carried from the ticket picker → seat hold →
 * checkout. Serialized into the `items` URL param as `typeId:qty,typeId:qty`
 * so back/refresh/share restore the selection.
 *
 * The cart is advisory: inventory is reserved by the pending order's items
 * (fn_ticket_type_remaining), and createOrder re-validates everything. These
 * helpers only keep the UI and hold honest.
 */

export interface CartLine {
  ticketTypeId: string;
  quantity: number;
}

export interface CartTicketType {
  id: string;
  remaining: number | null;
  perUserLimit: number | null;
  perOrderLimit: number | null;
  salesStatus?: string | null;
}

/** Mirrors the p_quantity cap in fn_create_seat_hold. */
export const MAX_CART_QUANTITY = 20;

const UUIDISH = /^[0-9a-fA-F-]{8,64}$/;

export function parseCartParam(value: string | null | undefined): CartLine[] {
  if (!value) return [];
  const merged = new Map<string, number>();
  for (const part of value.split(",")) {
    const [id, qtyRaw] = part.split(":");
    const ticketTypeId = id?.trim() ?? "";
    const quantity = Number(qtyRaw);
    if (!UUIDISH.test(ticketTypeId) || !Number.isInteger(quantity) || quantity < 1) continue;
    merged.set(ticketTypeId, (merged.get(ticketTypeId) ?? 0) + quantity);
  }
  return Array.from(merged, ([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
}

export function serializeCart(lines: ReadonlyArray<CartLine>): string {
  return lines
    .filter((l) => l.quantity > 0)
    .map((l) => `${l.ticketTypeId}:${l.quantity}`)
    .join(",");
}

export function cartQuantity(lines: ReadonlyArray<CartLine>): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}

export function isTicketTypeOnSale(t: Pick<CartTicketType, "salesStatus">): boolean {
  return t.salesStatus !== "paused" && t.salesStatus !== "hidden";
}

/** Max a buyer may pick for one type in a single order (null = no cap). */
export function ticketTypeLimit(t: CartTicketType): number | null {
  if (!isTicketTypeOnSale(t)) return 0;
  return getEffectivePurchaseLimit({
    perUserLimit: t.perUserLimit,
    perOrderLimit: t.perOrderLimit,
    remaining: t.remaining,
  });
}

/**
 * Drop unknown / unavailable types, clamp each line to its limit, and cap
 * the whole cart at MAX_CART_QUANTITY (earlier lines win).
 */
export function clampCart(
  lines: ReadonlyArray<CartLine>,
  types: ReadonlyArray<CartTicketType>,
): CartLine[] {
  const byId = new Map(types.map((t) => [t.id, t]));
  let budget = MAX_CART_QUANTITY;
  const out: CartLine[] = [];
  for (const line of lines) {
    const type = byId.get(line.ticketTypeId);
    if (!type || budget <= 0) continue;
    const limit = ticketTypeLimit(type);
    const quantity = Math.min(line.quantity, limit ?? line.quantity, budget);
    if (quantity < 1) continue;
    out.push({ ticketTypeId: line.ticketTypeId, quantity });
    budget -= quantity;
  }
  return out;
}
