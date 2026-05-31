"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPublicEventBySlug } from "@/lib/adapters/events"

export async function createSeatHoldAction(formData: FormData) {
  const eventSlug = (formData.get("eventSlug") as string | null)?.trim()
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1))

  if (!eventSlug) redirect("/browse")

  // Resolve slug → UUID using the same adapter the event detail page uses,
  // so we get consistent view-based access (v_event_public) regardless of
  // the caller's auth state.
  const event = await getPublicEventBySlug(eventSlug)
  if (!event?.id) redirect("/browse")

  const admin = createAdminClient()
  const { data: holdCode, error } = await admin.rpc("fn_create_seat_hold", {
    p_event_id: event.id,
    p_quantity: quantity,
  })

  if (error || !holdCode) {
    console.error("[createSeatHold] failed", error)
    redirect(`/events/${eventSlug}/checkout`)
  }

  redirect(`/events/${eventSlug}/checkout?hold=${holdCode}`)
}
