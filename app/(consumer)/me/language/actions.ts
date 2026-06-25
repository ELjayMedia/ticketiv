"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { LOCALES } from "@/lib/i18n/locales"

export interface ActionResult {
  ok: boolean
  error?: string
}

export async function setLocaleAction(locale: string): Promise<ActionResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  if (!LOCALES.some((l) => l.code === locale)) {
    return { ok: false, error: "Unsupported language." }
  }

  const { error } = await supabase.rpc("fn_set_my_locale", { p_locale: locale })
  if (error) {
    console.error("[language] set locale:", error)
    return { ok: false, error: "Could not save your language." }
  }

  revalidatePath("/me/language")
  revalidatePath("/me")
  return { ok: true }
}
