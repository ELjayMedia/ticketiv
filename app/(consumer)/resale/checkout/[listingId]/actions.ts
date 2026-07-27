"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { completeSpecialCheckoutForBuyer } from "@/lib/payments/special-checkout"
import { assertFeatureEnabled } from "@/lib/feature-flags"

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
  await assertFeatureEnabled("resale_enabled")
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
  await assertFeatureEnabled("resale_enabled")
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

  // Completion itself runs service-role behind a provider verification
  // (TICK-339) — this action only proves who is asking. The buyer-callable
  // completion RPCs were revoked, so a forged request cannot reach the RPC.
  let outcome
  try {
    outcome = await completeSpecialCheckoutForBuyer({
      paymentId,
      buyerId: user.id,
      expectedKind: "resale_checkout",
      expectedSubjectId: listingId,
    })
  } catch (error) {
    console.error("[resale-checkout] complete after payment:", error)
    return { ok: false, message: "We could not confirm this payment with the provider. Please try again in a moment." }
  }

  if (!outcome.ok) {
    if (outcome.reason === "not_successful" || outcome.reason === "unverifiable") {
      return { ok: false, message: "Payment is not confirmed yet. Once the provider marks it successful, your ticket transfer can be completed." }
    }
    if (outcome.reason === "mismatch") {
      return { ok: false, message: "This payment does not match the resale checkout. Please contact support before trying again." }
    }
    return { ok: false, message: "We could not find this resale checkout for your account." }
  }

  const row = (Array.isArray(outcome.result) ? outcome.result[0] : outcome.result) as
    | { buyer_order_item_id?: string }
    | undefined
  const ticketId = row?.buyer_order_item_id

  revalidatePath(`/resale/checkout/${listingId}`)
  revalidatePath("/tickets")
  redirect(ticketId ? `/tickets/${encodeURIComponent(ticketId)}?resale=completed` : "/tickets?resale=completed")
}
