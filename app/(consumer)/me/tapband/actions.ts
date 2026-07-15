"use server"

import { randomUUID } from "crypto"
import { revalidatePath } from "next/cache"

import { getMyTapBandProfile, validateTapBandLostReport } from "@/lib/data/attendee/tapband"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  assertTapBandLifecycleOk,
  createTapBandLifecycleService,
  TapBandLifecycleError,
} from "@/lib/tapband/lifecycle"

export interface TapBandLostActionResult {
  ok: boolean
  otpRequired?: boolean
  message?: string
  error?: string
}

export async function reportTapBandLostAction(
  formData: FormData,
): Promise<TapBandLostActionResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "TapBand reporting is not available." }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sign in again before reporting a TapBand lost." }

  const credentialId = String(formData.get("credentialId") ?? "")
  const confirmation = String(formData.get("confirmation") ?? "")
  const profile = await getMyTapBandProfile()
  if (!profile) return { ok: false, error: "Sign in again before reporting a TapBand lost." }

  const validation = validateTapBandLostReport(profile, credentialId, confirmation)
  if (!validation.ok) return { ok: false, error: validation.error }

  if (!user.email) {
    return { ok: false, error: "Add an email address to your account before using self-service lost reporting." }
  }

  const otp = String(formData.get("otp") ?? "").replace(/\s/g, "")
  if (!otp) {
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    })

    if (error) {
      console.error("[tapband-profile] lost report OTP:", error)
      return { ok: false, error: "Could not send a verification code. Try again or contact support." }
    }

    return {
      ok: false,
      otpRequired: true,
      message: "Enter the 6-digit code sent to your email.",
    }
  }

  if (!/^\d{6}$/.test(otp)) {
    return { ok: false, otpRequired: true, error: "Enter the 6-digit email code." }
  }

  const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
    email: user.email,
    token: otp,
    type: "email",
  })

  if (verifyError) {
    console.error("[tapband-profile] lost report verify:", verifyError)
    return { ok: false, otpRequired: true, error: "That code could not be verified." }
  }

  if (verified.user?.id && verified.user.id !== user.id) {
    return { ok: false, error: "That verification code belongs to another account." }
  }

  try {
    const result = await createTapBandLifecycleService().revokeCredential({
      credentialId,
      actorId: user.id,
      reason: "Customer reported TapBand lost from profile",
      newStatus: "lost",
      attemptId: randomUUID(),
      metadata: {
        source: "customer_profile",
        stepUp: "email_otp",
      },
    })

    assertTapBandLifecycleOk(result)
  } catch (error) {
    console.error("[tapband-profile] lost report revoke:", error)
    if (error instanceof TapBandLifecycleError && error.reasonCode.includes("unauthorized")) {
      return { ok: false, error: "That TapBand is not linked to your account." }
    }

    return { ok: false, error: "Could not mark this TapBand as lost. Contact support if it was stolen." }
  }

  revalidatePath("/me")
  revalidatePath("/profile")

  return {
    ok: true,
    message: "TapBand marked lost. QR tickets remain available in your account.",
  }
}
