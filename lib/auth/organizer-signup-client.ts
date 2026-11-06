"use client"

import type { createClient } from "@/lib/supabase/client"
import {
  ORGANIZER_SIGNUP_STORAGE_KEY,
  ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY,
  normalizeOrganizerSignup,
  validateOrganizerSignup,
  type OrganizerSignupPayload,
} from "@/lib/auth/organizer-signup"

/**
 * Browser side of organizer registration, shared by the details form, the
 * email-code form and the set-password form:
 *   details → requestOrganizerCode → /verify → (new user) /organizer/set-password
 *   → completeOrganizerSignup → /onboarding/organizer
 */

type BrowserSupabase = ReturnType<typeof createClient>

interface OrganizerSignupRpcClient {
  rpc(name: string, args: Record<string, string | null>): Promise<{ error: { message: string } | null }>
}

export function saveOrganizerSignup(payload: OrganizerSignupPayload, wasAuthenticated: boolean) {
  window.sessionStorage.setItem(ORGANIZER_SIGNUP_STORAGE_KEY, JSON.stringify(payload))
  window.sessionStorage.setItem(ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY, wasAuthenticated ? "1" : "0")
}

export function readOrganizerSignup(): OrganizerSignupPayload | null {
  const raw = window.sessionStorage.getItem(ORGANIZER_SIGNUP_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<OrganizerSignupPayload>
    if (
      typeof parsed.firstName !== "string" ||
      typeof parsed.surname !== "string" ||
      typeof parsed.phone !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.idNumber !== "string"
    ) return null
    const normalized = normalizeOrganizerSignup(parsed as OrganizerSignupPayload)
    return validateOrganizerSignup(normalized) ? null : normalized
  } catch {
    return null
  }
}

/** Whether the person was already signed in when they started (they keep their password). */
export function organizerWasAuthenticated(): boolean {
  return window.sessionStorage.getItem(ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY) === "1"
}

export function clearOrganizerSignup() {
  window.sessionStorage.removeItem(ORGANIZER_SIGNUP_STORAGE_KEY)
  window.sessionStorage.removeItem(ORGANIZER_WAS_AUTHENTICATED_STORAGE_KEY)
}

/** Sends (or resends) the six-digit organizer email code. */
export async function requestOrganizerCode(supabase: BrowserSupabase, signup: OrganizerSignupPayload) {
  const { error } = await supabase.auth.signInWithOtp({
    email: signup.email,
    options: {
      shouldCreateUser: true,
      data: {
        first_name: signup.firstName,
        surname: signup.surname,
        phone: signup.phone,
        signup_intent: "organizer",
      },
    },
  })
  return error
}

/** Creates the organizer profile for the verified, signed-in user (auth.uid() server-side). */
export async function completeOrganizerSignup(supabase: BrowserSupabase, signup: OrganizerSignupPayload) {
  const rpcClient = supabase as unknown as OrganizerSignupRpcClient
  const { error } = await rpcClient.rpc("fn_complete_organizer_signup", {
    p_first_name: signup.firstName,
    p_surname: signup.surname,
    p_phone: signup.phone,
    p_id_number: signup.idNumber || null,
  })
  if (error) throw new Error(error.message)
  clearOrganizerSignup()
}
