import "server-only"

import { ticketPaymentMethodsProblem, type CheckoutPaymentProvider } from "@/lib/payments/availability-core"
import type { createAdminClient } from "@/lib/supabase/admin"

/**
 * Server check before saving a ticket type's payment methods: see
 * `ticketPaymentMethodsProblem`. Returns a message for the organiser, or null.
 */
export async function ticketPaymentMethodsError(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  providers: ReadonlyArray<string>,
  currency: string | null,
): Promise<string | null> {
  if (providers.length === 0) return null
  const { data: event, error } = await admin.from("events").select("payment_providers").eq("id", eventId).maybeSingle()
  if (error || !event) return "Couldn't check this event's payment methods. Try again."
  const eventProviders = Array.isArray(event.payment_providers) ? event.payment_providers.map(String) : []
  return ticketPaymentMethodsProblem(providers as CheckoutPaymentProvider[], eventProviders, currency)
}
