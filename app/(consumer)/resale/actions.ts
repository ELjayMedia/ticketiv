"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { assertFeatureEnabled } from "@/lib/feature-flags"

type PublishResaleListingState = {
  ok: false
  message: string
}

function cleanMoneyToCents(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null
  const amount = Number.parseFloat(value.replace(/,/g, "").trim())
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100)
}

function cleanHours(value: FormDataEntryValue | null): number {
  const raw = typeof value === "string" ? Number.parseInt(value, 10) : 24
  if (!Number.isFinite(raw)) return 24
  return Math.min(168, Math.max(1, raw))
}

export async function publishResaleListing(
  _prevState: PublishResaleListingState | null,
  formData: FormData,
): Promise<PublishResaleListingState> {
  await assertFeatureEnabled("resale_enabled")
  const ticketId = String(formData.get("ticketId") ?? "").trim()
  const priceCents = cleanMoneyToCents(formData.get("price"))
  const listingHours = cleanHours(formData.get("expiresIn"))

  if (!ticketId) return { ok: false, message: "Ticket is missing. Please go back to My Tickets and try again." }
  if (!priceCents) return { ok: false, message: "Enter a valid listing price greater than zero." }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Ticketiv could not connect. Please try again." }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Please sign in before listing this ticket." }
  }

  const { data, error } = await supabase.rpc("fn_publish_resale_listing", {
    p_order_item_id: ticketId,
    p_price_cents: priceCents,
    p_listing_hours: listingHours,
  })

  if (error) {
    console.error("[resale] publish listing:", error)
    return {
      ok: false,
      message: "We could not publish this listing. The ticket may already be listed, checked in, refunded, revoked or not owned by this account.",
    }
  }

  const row = Array.isArray(data) ? data[0] : data
  const listingId = row?.listing_id

  revalidatePath("/resale")
  revalidatePath("/tickets")
  redirect(listingId ? `/resale?listingId=${encodeURIComponent(listingId)}&published=1` : "/resale?published=1")
}
