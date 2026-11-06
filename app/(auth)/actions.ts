"use server"

import { headers } from "next/headers"

import type { AuthFormState } from "@/lib/auth/form-state"
import { landingForSession } from "@/lib/auth/landing"
import { explainPasswordAuthError } from "@/lib/auth/messages"
import { isValidEmail } from "@/lib/auth/organizer-signup"
import { safeNext } from "@/lib/auth/redirect"
import { getTicketivPublicOrigin } from "@/lib/public-url"
import { createClient } from "@/lib/supabase/server"

const MIN_PASSWORD_LENGTH = 8

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

/**
 * Email + password login for every account (attendees, organizers, admins).
 *
 * One request: the session cookies are set on this response and the landing
 * page is worked out from the fresh session. No follow-up getUser, profile
 * bootstrap RPC (the sign-up trigger creates the profile) or /launch hop.
 */
export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email").toLowerCase()
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : ""
  const values = { email }

  if (!isValidEmail(email)) {
    return { status: "error", message: "Enter a valid email address, for example name@example.com.", values }
  }
  if (!password) return { status: "error", message: "Enter your password.", values }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session || !data.user) {
    return { status: "error", message: explainPasswordAuthError(error?.message ?? "", "login"), values }
  }

  const redirectTo =
    safeNext(formData.get("next")) ?? (await landingForSession(data.session.access_token, data.user.id))
  return { status: "success", redirectTo }
}

/** Account sign-up with email + password. The database trigger creates the profile. */
export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const firstName = field(formData, "firstName")
  const surname = field(formData, "surname")
  const phone = field(formData, "phone")
  const email = field(formData, "email").toLowerCase()
  const password = typeof formData.get("password") === "string" ? (formData.get("password") as string) : ""
  const values = { firstName, surname, phone, email }

  if (!firstName || !surname || !phone) {
    return { status: "error", message: "First name, surname and phone number are required.", values }
  }
  if (firstName.length > 100 || surname.length > 100) {
    return { status: "error", message: "Names must be 100 characters or fewer.", values }
  }
  if (!isValidEmail(email)) {
    return { status: "error", message: "Enter a valid email address, for example name@example.com.", values }
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { status: "error", message: `Use a password with at least ${MIN_PASSWORD_LENGTH} characters.`, values }
  }

  const next = safeNext(formData.get("next")) ?? "/"
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        first_name: firstName,
        surname,
        phone,
        display_name: `${firstName} ${surname}`,
        signup_intent: "account",
      },
    },
  })

  if (error) return { status: "error", message: explainPasswordAuthError(error.message, "signup"), values }
  if (!data.session) {
    return {
      status: "check-email",
      message: "Account created. Check your email for the confirmation link, then log in with your password.",
    }
  }
  return { status: "success", redirectTo: next }
}

/** The origin the form was posted from (preview deploys, the organizer host), as the browser reported it. */
async function requestOrigin(): Promise<string> {
  const origin = (await headers()).get("origin")
  // Supabase only accepts redirect URLs on its allowlist, so a forged Origin can't redirect elsewhere.
  return origin && /^https?:\/\/[^/]+$/.test(origin) ? origin : getTicketivPublicOrigin()
}
