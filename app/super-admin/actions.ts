"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { buildAdminPayload } from "@/lib/super-admin/form"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireSuperAdmin } from "@/lib/super-admin/auth"

export async function createResourceAction(resourceKey: string, formData: FormData) {
  await requireSuperAdmin()

  const resource = getAdminResource(resourceKey)
  if (!resource) throw new Error("Unknown admin resource")

  const admin = createAdminClient()
  const payload = buildAdminPayload(resource, formData)
  const { error } = await admin.from(resource.table).insert(payload)

  if (error) throw new Error(error.message)

  revalidatePath(`/super-admin/${resource.key}`)
  redirect(`/super-admin/${resource.key}`)
}

export async function updateResourceAction(resourceKey: string, recordId: string, formData: FormData) {
  await requireSuperAdmin()

  const resource = getAdminResource(resourceKey)
  if (!resource) throw new Error("Unknown admin resource")

  const admin = createAdminClient()
  const payload = buildAdminPayload(resource, formData)
  const { error } = await admin.from(resource.table).update(payload).eq(resource.primaryKey, recordId)

  if (error) throw new Error(error.message)

  revalidatePath(`/super-admin/${resource.key}`)
  revalidatePath(`/super-admin/${resource.key}/${recordId}`)
  redirect(`/super-admin/${resource.key}`)
}

export async function removeResourceAction(resourceKey: string, recordId: string) {
  await requireSuperAdmin()

  const resource = getAdminResource(resourceKey)
  if (!resource) throw new Error("Unknown admin resource")

  const admin = createAdminClient()
  const { error } = await admin.from(resource.table).delete().eq(resource.primaryKey, recordId)

  if (error) throw new Error(error.message)

  revalidatePath(`/super-admin/${resource.key}`)
}

export async function signOutSuperAdminAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/super-admin/login")
}
