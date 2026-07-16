"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireOrgCapability } from "@/lib/data/organizer/access"
import { normalizeOrgProfileInput } from "@/lib/data/organizer/profile"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function updateOrgProfileAction(orgId: string, formData: FormData) {
  await requireOrgCapability(orgId, "manage")

  const result = normalizeOrgProfileInput({
    name: formData.get("name"),
    bio: formData.get("bio"),
    logo: formData.get("logo"),
    defaultCurrency: formData.get("default_currency"),
  })

  if (!result.ok) throw new Error(result.error)

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const { error } = await supabase
    .from("organizations")
    .update(result.payload)
    .eq("id", orgId)

  if (error) throw new Error(error.message)

  revalidatePath("/orgs")
  revalidatePath(`/orgs/${orgId}/dashboard`)
  revalidatePath(`/orgs/${orgId}/onboarding`)
  revalidatePath(`/orgs/${orgId}/profile`)

  redirect(`/orgs/${orgId}/profile?status=saved`)
}
