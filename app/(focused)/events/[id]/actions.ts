"use server"

import { notFound, redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicEventBySlug } from "@/lib/adapters/events"

export async function createSeatHoldAction(formData: FormData) {
  const eventSlug = (formData.get("eventSlug") as string | null)?.trim()
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1))
  const ticketTypeId = (formData.get("ticketTypeId") as string | null)?.trim() || null

  if (!eventSlug) notFound()

  // Resolve slug → UUID using the same adapter the event detail page uses,
  // so we get consistent view-based access (v_event_public) regardless of
  // the caller's auth state.
  //
  // Do not redirect to /browse on failure here. This flow is already scoped
  // to a specific event and falling back to discovery hides the actual error
  // state from buyers and makes checkout debugging difficult.
  const event = await getPublicEventBySlug(eventSlug)
  if (!event?.id) notFound()

  const admin = createAdminClient()
  const { data: holdCode, error } = await admin.rpc("fn_create_seat_hold", {
    p_event_id: event.id,
    p_quantity: quantity,
    p_ticket_type_id: ticketTypeId,
  })

  if (error || !holdCode) {
    console.error("[createSeatHold] failed", error)
    redirect(`/events/${eventSlug}/checkout?hold_failed=1`)
  }

  redirect(`/events/${eventSlug}/checkout?hold=${holdCode}`)
}
