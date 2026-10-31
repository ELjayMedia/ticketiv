"use server"

import { notFound, redirect } from "next/navigation"
import { ensureCheckoutIdentity } from "@/lib/auth/checkout-identity"
import { getPublicEventBySlug } from "@/lib/adapters/events"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { deriveEventLifecycle } from "@/lib/events/lifecycle"
import { loadCheckoutAvailability } from "@/lib/checkout/availability"
import { cartQuantity, clampCart, parseCartParam, serializeCart } from "@/lib/checkout/cart"
import { mapCheckoutTicketType, type CheckoutTicketTypeProp } from "@/lib/mappers/checkout"

function redirectToLogin(eventSlug: string): never {
  const from = `/events/${encodeURIComponent(eventSlug)}`
  redirect(`/login?from=${encodeURIComponent(from)}`)
}

export interface TicketPickerData {
  ticketTypes: CheckoutTicketTypeProp[]
}

/**
 * Fresh availability for the ticket picker. Called when the picker opens so
 * remaining stock and limits are live rather than the event page's ISR copy.
 */
export async function loadTicketPickerAction(eventSlug: string): Promise<TicketPickerData | null> {
  const event = await getPublicEventBySlug(eventSlug)
  if (!event?.id) return null
  const { ticketTypes } = await loadCheckoutAvailability(event.id)
  return { ticketTypes: ticketTypes.map(mapCheckoutTicketType) }
}

function pickerUrl(eventSlug: string, cart: string, flag?: string): string {
  const params = new URLSearchParams({ tickets: "1" })
  if (cart) params.set("items", cart)
  if (flag) params.set(flag, "1")
  return `/events/${eventSlug}?${params.toString()}`
}

/**
 * Ticket picker "Check out": validate the cart against live availability,
 * create one seat hold for its total quantity, and open checkout carrying
 * the cart in `items`. Guests get an anonymous checkout identity — signing
 * in is never required to buy.
 *
 * seat_holds is a checkout countdown, not an inventory reservation (stock is
 * reserved by the pending order's items), so one hold covers a cart spanning
 * several ticket types. ticket_type_id is only set for single-type carts.
 */
export async function createSeatHoldAction(formData: FormData) {
  const eventSlug = (formData.get("eventSlug") as string | null)?.trim()
  if (!eventSlug) notFound()

  // Legacy single-type form (ticketTypeId + quantity) still maps to a cart.
  const legacyTypeId = (formData.get("ticketTypeId") as string | null)?.trim()
  const requested = parseCartParam(
    (formData.get("items") as string | null) ??
      (legacyTypeId ? `${legacyTypeId}:${Math.max(1, Number(formData.get("quantity") ?? 1))}` : null),
  )

  // Resolve slug → UUID using the same adapter the event detail page uses,
  // so we get consistent view-based access (v_event_public) regardless of
  // the caller's auth state.
  const event = await getPublicEventBySlug(eventSlug)
  if (!event?.id) notFound()

  const lifecycle = deriveEventLifecycle({
    status: event.status,
    eventStartsAt: event.starts_at,
    eventEndsAt: event.event_ends_at,
  })
  if (lifecycle === "ended" || lifecycle === "cancelled") {
    redirect(`/events/${eventSlug}?${lifecycle}=1`)
  }

  const { ticketTypes } = await loadCheckoutAvailability(event.id)
  const cart = clampCart(requested, ticketTypes.map(mapCheckoutTicketType))
  if (cart.length === 0) redirect(pickerUrl(eventSlug, serializeCart(requested), "unavailable"))
  const items = serializeCart(cart)

  // The hardened hold RPC requires auth.uid(). Reuse the cookie-backed client
  // that establishes an anonymous checkout identity for signed-out buyers so
  // both guest and signed-in holds retain their buyer attribution.
  const supabase = createServerSupabaseClient()
  if (!supabase) redirectToLogin(eventSlug)

  const identity = await ensureCheckoutIdentity(supabase)
  if (!identity) redirectToLogin(eventSlug)

  const { data: holdCode, error } = await (supabase.rpc as any)("fn_create_seat_hold", {
    p_event_id: event.id,
    p_quantity: cartQuantity(cart),
    p_ticket_type_id: cart.length === 1 ? cart[0].ticketTypeId : null,
  })

  if (error || !holdCode) {
    console.error("[createSeatHold] failed", error)
    redirect(pickerUrl(eventSlug, items, "hold_failed"))
  }

  redirect(`/events/${eventSlug}/checkout?${new URLSearchParams({ hold: holdCode, items }).toString()}`)
}
