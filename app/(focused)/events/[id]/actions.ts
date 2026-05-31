"use server"

import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function createSeatHoldAction(formData: FormData) {
  const eventSlug = (formData.get("eventSlug") as string | null)?.trim()
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1))

  if (!eventSlug) redirect("/browse")

  const supabase = await createServerSupabaseClient()
  if (!supabase) redirect(`/events/${eventSlug}/checkout`)

  const { data: eventRow } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle()

  if (!eventRow?.id) redirect("/browse")

  const admin = createAdminClient()
  const { data: holdCode, error } = await admin.rpc("fn_create_seat_hold", {
    p_event_id: eventRow.id,
    p_quantity: quantity,
  })

  if (error || !holdCode) {
    console.error("[createSeatHold] failed", error)
    redirect(`/events/${eventSlug}/checkout`)
  }

  redirect(`/events/${eventSlug}/checkout?hold=${holdCode}`)
}
