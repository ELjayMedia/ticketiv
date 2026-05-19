"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { buildAdminPayload } from "@/lib/super-admin/form"
import { allowedGenericMutationRolesForResource, type AdminRoleTier } from "@/lib/super-admin/permissions"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireAdminRole } from "@/lib/super-admin/auth"

const EVENT_OPS_ACTION_ROLES: AdminRoleTier[] = ["super_admin", "event_ops_admin"]

async function requireGenericResourceMutationAccess(resourceKey: string) {
  await requireAdminRole(allowedGenericMutationRolesForResource(resourceKey))
}

async function requireEventOpsActionAccess() {
  const { user } = await requireAdminRole(EVENT_OPS_ACTION_ROLES)
  return user
}

export async function createResourceAction(resourceKey: string, formData: FormData) {
  await requireGenericResourceMutationAccess(resourceKey)

  const resource = getAdminResource(resourceKey)
  if (!resource) throw new Error("Unknown admin resource")

  const admin = createAdminClient()
  const payload = buildAdminPayload(resource, formData)
  const { error } = await admin.from(resource.table).insert(payload)

  if (error) throw new Error(error.message)

  revalidatePath(`/super-admin/${resource.key}`)
  redirect(`/super-admin/${resource.key}?status=created`)
}

export async function updateResourceAction(resourceKey: string, recordId: string, formData: FormData) {
  await requireGenericResourceMutationAccess(resourceKey)

  const resource = getAdminResource(resourceKey)
  if (!resource) throw new Error("Unknown admin resource")

  const admin = createAdminClient()
  const payload = buildAdminPayload(resource, formData)
  const { error } = await admin.from(resource.table).update(payload).eq(resource.primaryKey, recordId)

  if (error) throw new Error(error.message)

  revalidatePath(`/super-admin/${resource.key}`)
  revalidatePath(`/super-admin/${resource.key}/${recordId}`)
  redirect(`/super-admin/${resource.key}?status=updated`)
}

export async function removeResourceAction(resourceKey: string, recordId: string) {
  await requireGenericResourceMutationAccess(resourceKey)

  const resource = getAdminResource(resourceKey)
  if (!resource) throw new Error("Unknown admin resource")

  const admin = createAdminClient()
  const { error } = await admin.from(resource.table).delete().eq(resource.primaryKey, recordId)

  if (error) throw new Error(error.message)

  revalidatePath(`/super-admin/${resource.key}`)
  redirect(`/super-admin/${resource.key}?status=deleted`)
}

export async function publishEventAction(eventId: string) {
  const user = await requireEventOpsActionAccess()
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

  revalidateEventAdminPaths(eventId)
  redirect("/super-admin/events?status=published")
}

export async function archiveEventAction(eventId: string, formData?: FormData) {
  const user = await requireEventOpsActionAccess()
  const admin = createAdminClient()
  const reason = formData?.get("reason")?.toString().trim() || "Archived by platform event operations"

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id, title, status")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) throw new Error(eventError.message)
  if (!event) throw new Error("Event not found")

  if (event.status === "archived") {
    await admin.from("admin_action_catalog").update({ is_enabled: true }).eq("key", "archive_event")
    revalidateEventAdminPaths(eventId)
    redirect("/super-admin/events?status=archived")
  }

  const { error: updateError } = await admin
    .from("events")
    .update({ status: "archived" })
    .eq("id", eventId)

  if (updateError) throw new Error(updateError.message)

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: user.id,
    table_name: "events",
    record_id: eventId,
    action: "update",
    changes: {
      business_action: "archive_event",
      previous_status: event.status,
      new_status: "archived",
      reason,
    },
  })

  await admin.from("admin_action_catalog").update({ is_enabled: true }).eq("key", "archive_event")

  revalidateEventAdminPaths(eventId)
  redirect("/super-admin/events?status=archived")
}

export async function pauseTicketTypeSalesAction(ticketTypeId: string, formData?: FormData) {
  await setTicketTypeSalesStatus(ticketTypeId, "paused", "pause_ticket_type_sales", formData?.get("reason")?.toString().trim() || "Paused by platform event operations")
  redirect("/super-admin/ticket-types?status=ticket_updated")
}

export async function resumeTicketTypeSalesAction(ticketTypeId: string) {
  await setTicketTypeSalesStatus(ticketTypeId, "on_sale", "resume_ticket_type_sales")
  redirect("/super-admin/ticket-types?status=ticket_updated")
}

export async function markTicketTypeSoldOutAction(ticketTypeId: string, formData?: FormData) {
  await setTicketTypeSalesStatus(ticketTypeId, "sold_out", "mark_ticket_type_sold_out", formData?.get("reason")?.toString().trim() || "Marked sold out by platform event operations")
  redirect("/super-admin/ticket-types?status=ticket_updated")
}

export async function hideTicketTypeAction(ticketTypeId: string, formData?: FormData) {
  await setTicketTypeSalesStatus(ticketTypeId, "hidden", "hide_ticket_type", formData?.get("reason")?.toString().trim() || "Hidden by platform event operations")
  redirect("/super-admin/ticket-types?status=ticket_updated")
}

export async function assignDeviceToEventAction(deviceId: string, formData: FormData) {
  const user = await requireEventOpsActionAccess()
  const admin = createAdminClient()
  const eventId = formData.get("event_id")?.toString().trim()

  if (!eventId) throw new Error("Event ID is required")

  const { data: device, error: deviceError } = await admin
    .from("devices")
    .select("id, org_id, event_id, device_role, label")
    .eq("id", deviceId)
    .maybeSingle()

  if (deviceError) throw new Error(deviceError.message)
  if (!device) throw new Error("Device not found")

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id, title")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) throw new Error(eventError.message)
  if (!event) throw new Error("Event not found")

  if (device.org_id !== event.org_id) {
    throw new Error("Device and event must belong to the same organization")
  }

  const { error: updateError } = await admin
    .from("devices")
    .update({ event_id: eventId, device_role: "organizer_scanner" })
    .eq("id", deviceId)

  if (updateError) throw new Error(updateError.message)

  await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: user.id,
    table_name: "devices",
    record_id: deviceId,
    action: "update",
    changes: {
      business_action: "assign_device_to_event",
      previous_event_id: device.event_id,
      new_event_id: eventId,
      previous_device_role: device.device_role,
      new_device_role: "organizer_scanner",
    },
  })

  revalidateDeviceAdminPaths(deviceId)
  redirect("/super-admin/devices?status=device_updated")
}

export async function unassignDeviceFromEventAction(deviceId: string) {
  const user = await requireEventOpsActionAccess()
  const admin = createAdminClient()

  const { data: device, error: deviceError } = await admin
    .from("devices")
    .select("id, org_id, event_id, device_role, label")
    .eq("id", deviceId)
    .maybeSingle()

  if (deviceError) throw new Error(deviceError.message)
  if (!device) throw new Error("Device not found")

  const { error: updateError } = await admin
    .from("devices")
    .update({ event_id: null, device_role: "scanner_unassigned" })
    .eq("id", deviceId)

  if (updateError) throw new Error(updateError.message)

  await admin.from("audit_log").insert({
    org_id: device.org_id,
    actor_id: user.id,
    table_name: "devices",
    record_id: deviceId,
    action: "update",
    changes: {
      business_action: "unassign_device_from_event",
      previous_event_id: device.event_id,
      new_event_id: null,
      previous_device_role: device.device_role,
      new_device_role: "scanner_unassigned",
    },
  })

  revalidateDeviceAdminPaths(deviceId)
  redirect("/super-admin/devices?status=device_updated")
}

async function setTicketTypeSalesStatus(
  ticketTypeId: string,
  nextStatus: "on_sale" | "paused" | "sold_out" | "hidden",
  businessAction: string,
  reason?: string,
) {
  const user = await requireEventOpsActionAccess()
  const admin = createAdminClient()

  const { data: ticketType, error: ticketTypeError } = await admin
    .from("ticket_types")
    .select("id, event_id, name, sales_status")
    .eq("id", ticketTypeId)
    .maybeSingle()

  if (ticketTypeError) throw new Error(ticketTypeError.message)
  if (!ticketType) throw new Error("Ticket type not found")

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id")
    .eq("id", ticketType.event_id)
    .maybeSingle()

  if (eventError) throw new Error(eventError.message)
  if (!event) throw new Error("Related event not found")

  if (ticketType.sales_status !== nextStatus) {
    const pauseFields = nextStatus === "paused"
      ? { sales_paused_at: new Date().toISOString(), sales_pause_reason: reason ?? null }
      : { sales_paused_at: null, sales_pause_reason: reason ?? null }

    const { error: updateError } = await admin
      .from("ticket_types")
      .update({
        sales_status: nextStatus,
        ...pauseFields,
      })
      .eq("id", ticketTypeId)

    if (updateError) throw new Error(updateError.message)

    await admin.from("audit_log").insert({
      org_id: event.org_id,
      actor_id: user.id,
      table_name: "ticket_types",
      record_id: ticketTypeId,
      action: "update",
      changes: {
        business_action: businessAction,
        previous_status: ticketType.sales_status,
        new_status: nextStatus,
        reason,
      },
    })
  }

  await admin.from("admin_action_catalog").update({ is_enabled: true }).eq("key", businessAction)
  revalidateTicketTypeAdminPaths(ticketTypeId)
}

function revalidateEventAdminPaths(eventId: string) {
  revalidatePath("/super-admin")
  revalidatePath("/super-admin/workspaces/event-operations")
  revalidatePath("/super-admin/events")
  revalidatePath(`/super-admin/events/${eventId}`)
}

function revalidateTicketTypeAdminPaths(ticketTypeId: string) {
  revalidatePath("/super-admin")
  revalidatePath("/super-admin/workspaces/ticket-inventory")
  revalidatePath("/super-admin/ticket-types")
  revalidatePath(`/super-admin/ticket-types/${ticketTypeId}`)
}

function revalidateDeviceAdminPaths(deviceId: string) {
  revalidatePath("/super-admin")
  revalidatePath("/super-admin/workspaces/access-control")
  revalidatePath("/super-admin/devices")
  revalidatePath(`/super-admin/devices/${deviceId}`)
}

export async function signOutSuperAdminAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/super-admin/login")
}
