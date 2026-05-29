"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type CreateOrgResult =
  | { ok: true; orgId: string; slug: string }
  | { ok: false; error: string }

const ERROR_COPY: Record<string, string> = {
  authentication_required: "Please sign in before creating an organisation.",
  name_required: "Enter an organisation name.",
}

export async function createOrganizationAction(input: { name: string; currency?: string }): Promise<CreateOrgResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Ticketiv could not connect. Please try again." }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Please sign in before creating an organisation." }

  const name = (input.name ?? "").trim()
  if (!name) return { ok: false, error: "Enter an organisation name." }

  const { data, error } = await supabase.rpc("fn_create_organization", {
    p_name: name,
    p_currency: input.currency?.trim() || "SZL",
  })

  if (error) {
    console.error("fn_create_organization failed", error)
    const code = Object.keys(ERROR_COPY).find((c) => error.message?.includes(c))
    return { ok: false, error: code ? ERROR_COPY[code] : "Unable to create organisation. Please try again." }
  }

  const result = (data ?? {}) as { id?: string; slug?: string }
  if (!result.id) return { ok: false, error: "Organisation was created but did not return an id." }

  return { ok: true, orgId: result.id, slug: result.slug ?? "" }
}
