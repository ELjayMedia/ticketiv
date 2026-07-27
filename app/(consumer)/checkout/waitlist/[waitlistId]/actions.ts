"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { completeSpecialCheckoutForBuyer } from "@/lib/payments/special-checkout"
import { assertFeatureEnabled } from "@/lib/feature-flags"

type CreateWaitlistCheckoutState = {
  ok: false
  message: string
}

type CompleteWaitlistCheckoutState = {
  ok: false
  message: string
}

export async function createWaitlistCheckout(
  _prevState: CreateWaitlistCheckoutState | null,
  formData: FormData,
): Promise<CreateWaitlistCheckoutState> {
  await assertFeatureEnabled("waitlist_enabled")
  const waitlistId = String(formData.get("waitlistId") ?? "").trim()
  if (!waitlistId) return { ok: false, message: "Waitlist offer is missing. Please go back and choose the offer again." }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Ticketiv could not connect. Please try again." }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Please sign in before continuing with this waitlist checkout." }
  }

  const { data, error } = await supabase.rpc("fn_create_waitlist_checkout_order", {
    p_waitlist_id: waitlistId,
  })

  if (error) {
    console.error("[waitlist-checkout] create pending order:", error)
    return { ok: false, message: "We could not create this waitlist checkout. The offer may have expired or become unavailable." }
  }

  const row = Array.isArray(data) ? data[0] : data
  const orderId = row?.order_id
  const paymentId = row?.payment_id

  if (!orderId || !paymentId) {
    return { ok: false, message: "The waitlist checkout was created but did not return payment details. Please try again." }
  }

  revalidatePath(`/checkout/waitlist/${waitlistId}`)
  redirect(`/checkout/waitlist/${waitlistId}?orderId=${encodeURIComponent(orderId)}&paymentId=${encodeURIComponent(paymentId)}&pending=1`)
}

export async function completeWaitlistCheckout(
  _prevState: CompleteWaitlistCheckoutState | null,
  formData: FormData,
): Promise<CompleteWaitlistCheckoutState> {
  await assertFeatureEnabled("waitlist_enabled")
  const waitlistId = String(formData.get("waitlistId") ?? "").trim()
  const paymentId = String(formData.get("paymentId") ?? "").trim()

  if (!waitlistId || !paymentId) {
    return { ok: false, message: "Missing waitlist checkout details. Please refresh and try again." }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Ticketiv could not connect. Please try again." }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Please sign in before completing this waitlist checkout." }
  }

  // Completion itself runs service-role behind a provider verification
  // (TICK-339) — this action only proves who is asking. The buyer-callable
  // completion RPCs were revoked, so a forged request cannot reach the RPC.
  let outcome
  try {
    outcome = await completeSpecialCheckoutForBuyer({
      paymentId,
      buyerId: user.id,
      expectedKind: "waitlist_checkout",
      expectedSubjectId: waitlistId,
    })
  } catch (error) {
    console.error("[waitlist-checkout] complete after payment:", error)
    return { ok: false, message: "We could not confirm this payment with the provider. Please try again in a moment." }
  }

  if (!outcome.ok) {
    if (outcome.reason === "not_successful" || outcome.reason === "unverifiable") {
      return { ok: false, message: "Payment is not confirmed yet. Once the provider marks it successful, your tickets can be issued." }
    }
    if (outcome.reason === "mismatch") {
      return { ok: false, message: "This payment does not match the waitlist offer. Please contact support before trying again." }
    }
    return { ok: false, message: "We could not find this waitlist checkout for your account." }
  }

  const orderId = outcome.orderId

  revalidatePath(`/checkout/waitlist/${waitlistId}`)
  revalidatePath("/tickets")
  revalidatePath("/waitlist")
  redirect(orderId ? `/tickets?waitlist=fulfilled&orderId=${encodeURIComponent(orderId)}` : "/tickets?waitlist=fulfilled")
}
