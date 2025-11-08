"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase"

export type SignupState = {
  error: string | null
}

const redirectPath = "/browse"

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!name || !email || !password || !confirmPassword) {
    return { error: "Please complete all fields." }
  }

  if (!email.includes("@")) {
    return { error: "Please enter a valid email address." }
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." }
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { full_name: name } : undefined,
    },
  })

  if (error) {
    return { error: error.message }
  }

  redirect(redirectPath)
}

export const initialSignupState: SignupState = { error: null }
