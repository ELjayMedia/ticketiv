// Persists ticket selection through an auth redirect.
// Uses sessionStorage so it clears automatically when the tab closes.
const KEY = "ticketiv_pending_cart"

export interface PendingCart {
  eventId: string
  items: Array<{ ticketTypeId: string; quantity: number }>
  returnPath: string // e.g. /events/abc123/checkout
}

export function savePendingCart(cart: PendingCart): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(KEY, JSON.stringify(cart))
}

export function loadPendingCart(): PendingCart | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as PendingCart) : null
  } catch {
    return null
  }
}

export function clearPendingCart(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(KEY)
}
