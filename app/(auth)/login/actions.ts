"use server"

import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase"

export type AuthState = {
  error: string | null
}

const redirectPath = "/browse"

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Please provide both email and password." }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect(redirectPath)
}

export const initialAuthState: AuthState = { error: null }
