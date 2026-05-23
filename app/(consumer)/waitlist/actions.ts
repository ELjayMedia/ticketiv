"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type JoinWaitlistResult = {
  ok: false
  message: string
}

function cleanString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function cleanUuid(value: FormDataEntryValue | null): string | null {
  const text = cleanString(value)
  if (!text) return null
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null
}

function cleanQuantity(value: FormDataEntryValue | null): number {
  const raw = typeof value === "string" ? Number.parseInt(value, 10) : 1
  if (!Number.isFinite(raw)) return 1
  return Math.min(10, Math.max(1, raw))
}

function cleanEmail(value: FormDataEntryValue | null): string | null {
  const text = cleanString(value)?.toLowerCase() ?? null
  if (!text) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : null
}

export async function joinWaitlist(_prevState: JoinWaitlistResult | null, formData: FormData): Promise<JoinWaitlistResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Ticketiv is temporarily unable to connect. Please try again." }

  const eventId = cleanUuid(formData.get("eventId"))
  if (!eventId) return { ok: false, message: "Choose a valid event before joining the waitlist." }

  const ticketTypeId = cleanUuid(formData.get("ticketTypeId"))
  const quantityRequested = cleanQuantity(formData.get("quantityRequested"))
  const firstName = cleanString(formData.get("firstName"))
  const lastName = cleanString(formData.get("lastName"))
  const emailFromForm = cleanEmail(formData.get("email"))

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const email = user?.email ?? emailFromForm
  if (!user && !email) {
    return { ok: false, message: "Add your email address so we can notify you if tickets become available." }
  }

  const payload = {
    event_id: eventId,
    ticket_type_id: ticketTypeId,
    user_id: user?.id ?? null,
    email,
    first_name: firstName,
    last_name: lastName,
    quantity_requested: quantityRequested,
    status: "active",
  }

  const { error } = await supabase.from("waitlists").insert(payload)

  if (error) {
    console.error("[waitlist] join:", error)
    return { ok: false, message: "We could not add you to the waitlist. Please try again." }
  }

  revalidatePath("/waitlist")
  redirect("/waitlist?joined=1")
}
