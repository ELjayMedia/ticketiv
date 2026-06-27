"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type CreateTalentResult =
  | { ok: true; artistId: string; slug: string; existing: boolean }
  | { ok: false; error: string }

const ERROR_COPY: Record<string, string> = {
  authentication_required: "Please sign in before creating a talent profile.",
  name_required: "Enter your artist or performer name.",
}

// TICK-272 — talent claim door. Creates a self-owned artists row
// (primary_user_id = caller, no org) so the Talent context surfaces.
export async function createTalentProfileAction(input: { name: string }): Promise<CreateTalentResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Ticketiv could not connect. Please try again." }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Please sign in before creating a talent profile." }

  const name = (input.name ?? "").trim()
  if (!name) return { ok: false, error: "Enter your artist or performer name." }

  const { data, error } = await supabase.rpc("fn_create_talent_profile", { p_name: name })
  if (error) {
    console.error("fn_create_talent_profile failed", error)
    const code = Object.keys(ERROR_COPY).find((c) => error.message?.includes(c))
    return { ok: false, error: code ? ERROR_COPY[code] : "Unable to create your talent profile. Please try again." }
  }

  const result = (data ?? {}) as { id?: string; slug?: string; existing?: boolean }
  if (!result.id) return { ok: false, error: "Talent profile was created but did not return an id." }

  return { ok: true, artistId: result.id, slug: result.slug ?? "", existing: Boolean(result.existing) }
}
