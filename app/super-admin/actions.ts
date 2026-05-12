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

export async function publishEventAction(eventId: string) {
  const user = await requireSuperAdmin()
  const admin = createAdminClient()

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id, venue_id, title, slug, starts_at, status, visibility")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) throw new Error(eventError.message)
  if (!event) throw new Error("Event not found")

  const readinessErrors: string[] = []

  if (!event.org_id) readinessErrors.push("Organization is required")
  if (!event.venue_id) readinessErrors.push("Venue is required")
  if (!event.title || !String(event.title).trim()) readinessErrors.push("Title is required")
  if (!event.slug || !String(event.slug).trim()) readinessErrors.push("Slug is required")
  if (!event.starts_at) readinessErrors.push("Start date is required")

  const { count: ticketCount, error: ticketError } = await admin
    .from("ticket_types")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .gt("quota", 0)

  if (ticketError) throw new Error(ticketError.message)
  if (!ticketCount) readinessErrors.push("At least one ticket type with quota is required")

  if (readinessErrors.length) {
    throw new Error(`Event is not ready to publish: ${readinessErrors.join(", ")}`)
  }

  const { error: updateError } = await admin
    .from("events")
    .update({
      status: "published",
      visibility: event.visibility || "public",
      published_at: new Date().toISOString(),
    })
    .eq("id", eventId)

  if (updateError) throw new Error(updateError.message)

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: user.id,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: {
      business_action: "publish_event",
      previous_status: event.status,
      new_status: "published",
    },
  })

  await admin.from("admin_action_catalog").update({ is_enabled: true }).eq("key", "publish_event")

  revalidatePath("/super-admin")
  revalidatePath("/super-admin/workspaces/event-operations")
  revalidatePath("/super-admin/events")
  revalidatePath(`/super-admin/events/${eventId}`)
}

export async function signOutSuperAdminAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/super-admin/login")
}
