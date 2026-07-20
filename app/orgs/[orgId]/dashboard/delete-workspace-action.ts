"use server"

import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function deleteWorkspaceAction(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "")
  const confirmation = String(formData.get("confirmation") ?? "")

  if (!orgId || !confirmation) {
    redirect(`/orgs/${orgId}/dashboard?deleteError=${encodeURIComponent("Type the workspace name to confirm deletion.")}`)
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { error } = await supabase.rpc("fn_delete_organization", {
    p_org_id: orgId,
    p_confirm_name: confirmation,
  })

  if (error) {
    redirect(`/orgs/${orgId}/dashboard?deleteError=${encodeURIComponent(error.message)}`)
  }

  redirect("/organizer")
}
