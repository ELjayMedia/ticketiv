"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type CreateResaleCheckoutState = {
  ok: false
  message: string
}

type CompleteResaleCheckoutState = {
  ok: false
  message: string
}

export async function createResaleCheckout(
  _prevState: CreateResaleCheckoutState | null,
  formData: FormData,
): Promise<CreateResaleCheckoutState> {
  const listingId = String(formData.get("listingId") ?? "").trim()
  if (!listingId) return { ok: false, message: "Listing is missing. Please go back and choose a resale ticket again." }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Ticketiv could not connect. Please try again." }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Please sign in before continuing with this resale checkout." }
  }

  const { data, error } = await supabase.rpc("fn_create_resale_checkout_order", {
    p_listing_id: listingId,
  })

  if (error) {
    console.error("[resale-checkout] create pending order:", error)
    return { ok: false, message: "We could not create this resale checkout. The listing may have expired or become unavailable." }
  }

  const row = Array.isArray(data) ? data[0] : data
  const orderId = row?.order_id
  const paymentId = row?.payment_id

  if (!orderId || !paymentId) {
    return { ok: false, message: "The resale checkout was created but did not return payment details. Please try again." }
  }

  revalidatePath(`/resale/checkout/${listingId}`)
  redirect(`/resale/checkout/${listingId}?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}&pending=1`)
}

export async function completeResaleCheckout(
  _prevState: CompleteResaleCheckoutState | null,
  formData: FormData,
): Promise<CompleteResaleCheckoutState> {
  const listingId = String(formData.get("listingId") ?? "").trim()
  const paymentId = String(formData.get("paymentId") ?? "").trim()

  if (!listingId || !paymentId) {
    return { ok: false, message: "Missing resale checkout details. Please refresh and try again." }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Ticketiv could not connect. Please try again." }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Please sign in before completing this resale checkout." }
  }

  const { data, error } = await supabase.rpc("fn_complete_resale_after_payment", {
    p_listing_id: listingId,
    p_payment_id: paymentId,
  })

  if (error) {
    console.error("[resale-checkout] complete after payment:", error)
    return { ok: false, message: "Payment is not confirmed yet. Once the provider marks it successful, your ticket transfer can be completed." }
  }

  const row = Array.isArray(data) ? data[0] : data
  const ticketId = row?.buyer_order_item_id

  revalidatePath(`/resale/checkout/${listingId}`)
  revalidatePath("/tickets")
  redirect(ticketId ? `/tickets/${encodeURIComponent(ticketId)}?resale=completed` : "/tickets?resale=completed")
}
