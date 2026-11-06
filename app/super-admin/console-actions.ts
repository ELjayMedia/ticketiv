"use server"

import { revalidatePath } from "next/cache"

import { deliverTicketsForOrder } from "@/lib/notifications/ticket-delivery"
import { sendEmail } from "@/lib/notifications/channels/email"
import { buildTicketivPublicUrl } from "@/lib/public-url"
import { adminForAction } from "@/lib/super-admin/auth"
import {
  INVITABLE_ROLES,
  formatMoney,
  isUuid,
  normalizeEmail,
  reasonProblem,
  type AdminRoleTier,
  type ConsoleAction,
  type ConsoleActionResult,
} from "@/lib/super-admin/console"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

// Admin console, phase 1: the support actions. Every one of them
//   1. checks the admin's role for that action (lib/super-admin/console.ts),
//   2. requires a written reason when it changes something,
//   3. writes one audit_log row (business_action "admin_console") that the
//      order and person pages show in their history.
// They return a result for useActionState instead of throwing, so the form can
// say what happened in plain words.

type Admin = ReturnType<typeof createAdminClient>

const done = (message: string): ConsoleActionResult => ({ status: "done", message })
const fail = (message: string): ConsoleActionResult => ({ status: "error", message })
const NOT_ALLOWED = fail("Your role can't do this. Ask the owner, or leave a note instead.")

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

async function gate(action: ConsoleAction, formData: FormData, needsReason = true) {
  const context = await adminForAction(action)
  if (!context) return { ok: false as const, error: NOT_ALLOWED }
  const reason = field(formData, "reason")
  if (needsReason) {
    const problem = reasonProblem(reason)
    if (problem) return { ok: false as const, error: fail(problem) }
  }
  return { ok: true as const, context, reason, admin: createAdminClient() }
}

async function audit(
  admin: Admin,
  actorId: string,
  entry: {
    action: ConsoleAction
    table: string
    recordId: string
    summary: string
    reason?: string
    orgId?: string | null
    details?: Record<string, unknown>
  },
) {
  const { error } = await admin.from("audit_log").insert({
    org_id: entry.orgId ?? null,
    actor_id: actorId,
    table_name: entry.table,
    record_id: entry.recordId,
    action: "other",
    changes: {
      business_action: "admin_console",
      action: entry.action,
      summary: entry.summary,
      reason: entry.reason ?? null,
      ...(entry.details ?? {}),
    } as Json,
  })
  if (error) console.error("[admin-console] audit insert failed", entry.action, error.message)
}

async function orderOrg(admin: Admin, orderId: string) {
  const { data } = await admin.from("orders").select("org_id").eq("id", orderId).maybeSingle()
  return data?.org_id ?? null
}

function describeDelivery(outcomes: Awaited<ReturnType<typeof deliverTicketsForOrder>>) {
  if (!outcomes) return { ok: false, text: "There are no issued tickets on this order to send." }
  const sent = outcomes.filter((o) => o.status === "sent").map((o) => o.channel)
  const failed = outcomes.filter((o) => o.status === "failed").map((o) => o.channel)
  if (sent.length) return { ok: true, text: `Sent by ${sent.join(" and ")}.` }
  if (failed.length) return { ok: false, text: `Sending by ${failed.join(" and ")} failed. Check the address, or try again later.` }
  return { ok: false, text: "No delivery channel is set up (email provider not configured). The tickets are still in the buyer's account." }
}

function revalidateOrder(orderId: string) {
  revalidatePath(`/super-admin/order/${orderId}`)
}

// --------------------------------------------------------------------------
// Orders

export async function resendTicketsAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("resend_tickets", formData)
  if (!g.ok) return g.error
  const orderId = field(formData, "orderId")
  if (!isUuid(orderId)) return fail("Order not found.")
  const rawTo = field(formData, "toEmail")
  const toEmail = rawTo ? normalizeEmail(rawTo) : null
  if (rawTo && !toEmail) return fail("That email address doesn't look right.")

  const outcome = describeDelivery(await deliverTicketsForOrder(orderId, { force: true, toEmail }))
  await audit(g.admin, g.context.user.id, {
    action: "resend_tickets",
    table: "orders",
    recordId: orderId,
    orgId: await orderOrg(g.admin, orderId),
    summary: outcome.ok ? "Tickets resent" : "Tried to resend tickets",
    reason: g.reason,
    details: { order_id: orderId, sent_to_other_address: Boolean(toEmail), result: outcome.text },
  })
  revalidateOrder(orderId)
  return outcome.ok ? done(`Tickets resent. ${outcome.text}`) : fail(outcome.text)
}

export async function changeBuyerEmailAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("change_buyer_email", formData)
  if (!g.ok) return g.error
  const orderId = field(formData, "orderId")
  const email = normalizeEmail(field(formData, "email"))
  if (!isUuid(orderId)) return fail("Order not found.")
  if (!email) return fail("Enter a valid email address.")

  const { data: order } = await g.admin.from("orders").select("id, org_id, buyer_email, email").eq("id", orderId).maybeSingle()
  if (!order) return fail("Order not found.")
  if ((order.buyer_email ?? order.email ?? "").toLowerCase() === email) return fail("The order already uses that address.")

  const { error } = await g.admin.from("orders").update({ buyer_email: email, email }).eq("id", orderId)
  if (error) return fail(`Couldn't change the email: ${error.message}`)

  const outcome = describeDelivery(await deliverTicketsForOrder(orderId, { force: true }))
  await audit(g.admin, g.context.user.id, {
    action: "change_buyer_email",
    table: "orders",
    recordId: orderId,
    orgId: order.org_id,
    summary: "Buyer email changed",
    reason: g.reason,
    details: { order_id: orderId, previous_email: order.buyer_email ?? order.email, new_email: email, resend: outcome.text },
  })
  revalidateOrder(orderId)
  return done(`Email changed. ${outcome.ok ? `Tickets resent: ${outcome.text}` : outcome.text}`)
}

export async function reissueTicketAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("reissue_ticket", formData)
  if (!g.ok) return g.error
  const orderId = field(formData, "orderId")
  const orderItemId = field(formData, "orderItemId")
  if (!isUuid(orderId) || !isUuid(orderItemId)) return fail("Ticket not found.")

  const { data: item } = await g.admin.from("order_items").select("id, order_id, ticket_code").eq("id", orderItemId).maybeSingle()
  if (!item || item.order_id !== orderId) return fail("Ticket not found on this order.")

  const db = g.admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any }
  const { data: newCode, error } = await db.rpc("admin_reissue_ticket_code", { p_order_item_id: orderItemId })
  if (error) {
    return fail(
      error.message?.includes("ticket_not_reissuable")
        ? "Only valid tickets that haven't been scanned can be reissued."
        : `Couldn't reissue the ticket: ${error.message}`,
    )
  }

  const outcome = describeDelivery(await deliverTicketsForOrder(orderId, { force: true }))
  await audit(g.admin, g.context.user.id, {
    action: "reissue_ticket",
    table: "order_items",
    recordId: orderItemId,
    orgId: await orderOrg(g.admin, orderId),
    summary: "Ticket reissued, old code stopped",
    reason: g.reason,
    details: { order_id: orderId, order_item_id: orderItemId, previous_code: item.ticket_code, new_code: newCode },
  })
  revalidateOrder(orderId)
  return done(`New ticket code ${newCode}. The old code no longer scans. ${outcome.text}`)
}

export async function requestRefundAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("request_refund", formData)
  if (!g.ok) return g.error
  const orderId = field(formData, "orderId")
  if (!isUuid(orderId)) return fail("Order not found.")

  const { data: order } = await g.admin.from("orders").select("id, org_id, status, currency").eq("id", orderId).maybeSingle()
  if (!order) return fail("Order not found.")
  if (order.status !== "paid") return fail("Only paid orders can be refunded.")

  const { data: payment } = await g.admin
    .from("payments")
    .select("id, provider, amount_cents, currency")
    .eq("order_id", orderId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!payment) return fail("This order has no successful payment to refund.")

  const { data: active } = await g.admin
    .from("refunds")
    .select("id, status, amount_cents")
    .eq("payment_id", payment.id)
    .in("status", ["requested", "processing", "processed"])
  if ((active ?? []).some((r) => r.status === "requested" || r.status === "processing")) {
    return fail("A refund for this order is already in progress.")
  }
  const reserved = (active ?? []).reduce((sum, r) => sum + Math.max(0, r.amount_cents ?? 0), 0)
  const amountCents = payment.amount_cents - reserved
  if (amountCents <= 0) return fail("This order has already been refunded in full.")

  const { data: items } = await g.admin
    .from("order_items")
    .select("id, status, ticket_types(price_cents, event_id)")
    .eq("order_id", orderId)
    .in("status", ["issued", "transferred"])
  const eventId = ((items ?? [])[0] as any)?.ticket_types?.event_id ?? null

  const { data: refund, error } = await g.admin
    .from("refunds")
    .insert({
      payment_id: payment.id,
      amount_cents: amountCents,
      currency: payment.currency,
      type: amountCents === payment.amount_cents ? "full" : "partial",
      status: "requested",
      initiated_by: g.context.user.id,
      provider_payload: {
        source: "admin_console",
        reason: g.reason,
        order_id: orderId,
        event_id: eventId,
        payment_provider: payment.provider,
        requested_by_role: g.context.role,
        items: ((items ?? []) as any[]).map((item) => ({
          order_item_id: item.id,
          amount_cents: item.ticket_types?.price_cents ?? 0,
          currency: payment.currency,
        })),
      },
    })
    .select("id")
    .single()
  if (error || !refund) return fail(`Couldn't request the refund: ${error?.message ?? "unknown error"}`)

  await audit(g.admin, g.context.user.id, {
    action: "request_refund",
    table: "orders",
    recordId: orderId,
    orgId: order.org_id,
    summary: `Refund of ${formatMoney(amountCents, payment.currency)} requested`,
    reason: g.reason,
    details: { order_id: orderId, refund_id: refund.id, amount_cents: amountCents },
  })
  revalidateOrder(orderId)
  return done(
    `Refund of ${formatMoney(amountCents, payment.currency)} requested. It is approved and sent through the usual refund flow, so no money has moved yet.`,
  )
}

// --------------------------------------------------------------------------
// People

async function accountEmail(admin: Admin, userId: string) {
  if (!isUuid(userId)) return null
  const { data } = await admin.auth.admin.getUserById(userId)
  return data?.user?.email ?? null
}

/** A sign-in link we build and email ourselves, verified by /auth/confirm on any device. */
function authLink(hashedToken: string, type: "recovery" | "invite", next: string) {
  const params = new URLSearchParams({ token_hash: hashedToken, type, next })
  return buildTicketivPublicUrl(`/auth/confirm?${params}`)
}

export async function sendPasswordResetAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("send_password_reset", formData)
  if (!g.ok) return g.error
  const userId = field(formData, "userId")
  const email = await accountEmail(g.admin, userId)
  if (!email) return fail("This account has no email address.")

  const { data, error } = await g.admin.auth.admin.generateLink({ type: "recovery", email })
  const hashed = data?.properties?.hashed_token
  if (error || !hashed) return fail(`Couldn't create the reset link: ${error?.message ?? "unknown error"}`)

  const link = authLink(hashed, "recovery", "/reset-password")
  const sent = await sendEmail({
    to: email,
    subject: "Reset your Ticketiv password",
    text: `Someone from Ticketiv support sent you this link to set a new password:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: `<p>Someone from Ticketiv support sent you this link to set a new password.</p><p><a href="${link}">Set a new password</a></p><p>If you didn't ask for this, you can ignore this email.</p>`,
  })

  await audit(g.admin, g.context.user.id, {
    action: "send_password_reset",
    table: "auth.users",
    recordId: userId,
    summary: sent.status === "sent" ? "Password reset link sent" : "Tried to send a password reset link",
    reason: g.reason,
    details: { delivery: sent.status },
  })
  revalidatePath(`/super-admin/people/${userId}`)
  if (sent.status !== "sent") return fail("The email couldn't be sent (email provider not configured or it refused).")
  return done(`Reset link sent to ${email}. Support never sees or sets the password.`)
}

export async function signOutEverywhereAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("sign_out_everywhere", formData)
  if (!g.ok) return g.error
  const userId = field(formData, "userId")
  if (!isUuid(userId)) return fail("Account not found.")
  if (userId === g.context.user.id) return fail("Use Sign out for your own account.")

  const db = g.admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any }
  const { data: count, error } = await db.rpc("admin_revoke_user_sessions", { p_user_id: userId })
  if (error) return fail(`Couldn't sign them out: ${error.message}`)

  await audit(g.admin, g.context.user.id, {
    action: "sign_out_everywhere",
    table: "auth.users",
    recordId: userId,
    summary: "Signed out of all devices",
    reason: g.reason,
    details: { sessions_ended: count ?? 0 },
  })
  revalidatePath(`/super-admin/people/${userId}`)
  return done(`Ended ${count ?? 0} session${count === 1 ? "" : "s"}. Pages already open stop working within the hour.`)
}

// --------------------------------------------------------------------------
// Notes

export async function addNoteAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("add_note", formData, false)
  if (!g.ok) return g.error
  const subjectType = field(formData, "subjectType")
  const subjectId = field(formData, "subjectId")
  const body = field(formData, "body")
  if (!["order", "person"].includes(subjectType) || !isUuid(subjectId)) return fail("Nothing to attach the note to.")
  if (!body) return fail("Write the note first.")
  if (body.length > 4000) return fail("Keep notes under 4,000 characters.")

  const db = g.admin as unknown as { from: (table: string) => any }
  const { error } = await db.from("admin_notes").insert({
    subject_type: subjectType,
    subject_id: subjectId,
    author_id: g.context.user.id,
    body,
  })
  if (error) return fail(`Couldn't save the note: ${error.message}`)

  revalidatePath(subjectType === "order" ? `/super-admin/order/${subjectId}` : `/super-admin/people/${subjectId}`)
  return done("Note added.")
}

// --------------------------------------------------------------------------
// Team & access (owner only)

const SIGN_IN_PATH = "/super-admin/login"

async function findUserByEmail(admin: Admin, email: string) {
  const db = admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any }
  const { data } = await db.rpc("admin_search_people", { p_query: email, p_limit: 5 })
  return ((data ?? []) as Array<{ user_id: string; email: string | null }>).find((row) => row.email?.toLowerCase() === email) ?? null
}

export async function inviteAdminAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("manage_team", formData, false)
  if (!g.ok) return g.error
  const email = normalizeEmail(field(formData, "email"))
  const role = field(formData, "role") as AdminRoleTier
  if (!email) return fail("Enter a valid email address.")
  if (!INVITABLE_ROLES.includes(role)) return fail("Pick a role.")

  const signInUrl = buildTicketivPublicUrl(SIGN_IN_PATH)
  let userId: string
  let message: { subject: string; text: string; html: string }

  const existing = await findUserByEmail(g.admin, email)
  if (existing) {
    userId = existing.user_id
    const { data: current } = await g.admin.from("admin_users").select("active").eq("user_id", userId).maybeSingle()
    if (current?.active) return fail("That person already has admin access. Change their role in the list instead.")
    message = {
      subject: "You have access to the Ticketiv admin console",
      text: `You've been given access to the Ticketiv admin console. Sign in with your usual Ticketiv email and password:\n\n${signInUrl}`,
      html: `<p>You've been given access to the Ticketiv admin console.</p><p><a href="${signInUrl}">Sign in</a> with your usual Ticketiv email and password.</p>`,
    }
  } else {
    const { data, error } = await g.admin.auth.admin.generateLink({ type: "invite", email })
    const hashed = data?.properties?.hashed_token
    if (error || !hashed || !data.user) return fail(`Couldn't create the invite: ${error?.message ?? "unknown error"}`)
    userId = data.user.id
    const link = authLink(hashed, "invite", "/reset-password")
    message = {
      subject: "Set up your Ticketiv admin account",
      text: `You've been invited to the Ticketiv admin console. Choose your password with this link (it works once):\n\n${link}\n\nAfter that, sign in at ${signInUrl}`,
      html: `<p>You've been invited to the Ticketiv admin console.</p><p><a href="${link}">Choose your password</a> (the link works once).</p><p>After that, sign in at <a href="${signInUrl}">${signInUrl}</a>.</p>`,
    }
  }

  const { error: upsertError } = await g.admin
    .from("admin_users")
    .upsert({ user_id: userId, role_tier: role, active: true, notes: `Invited by ${g.context.user.email ?? g.context.user.id}` }, { onConflict: "user_id" })
  if (upsertError) return fail(`Couldn't give access: ${upsertError.message}`)

  const sent = await sendEmail({ to: email, ...message })
  await audit(g.admin, g.context.user.id, {
    action: "manage_team",
    table: "admin_users",
    recordId: userId,
    summary: `Invited as ${role}`,
    details: { role, existing_account: Boolean(existing), delivery: sent.status },
  })
  revalidatePath("/super-admin/team")
  if (sent.status !== "sent") {
    return fail("Access was granted, but the email couldn't be sent. Check the email provider, then use Resend invite.")
  }
  return done(`Invite sent to ${email}.`)
}

export async function resendAdminInviteAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("manage_team", formData, false)
  if (!g.ok) return g.error
  const userId = field(formData, "userId")
  const email = await accountEmail(g.admin, userId)
  if (!email) return fail("Account not found.")

  // A fresh recovery link: works for invited accounts that never set a password.
  const { data, error } = await g.admin.auth.admin.generateLink({ type: "recovery", email })
  const hashed = data?.properties?.hashed_token
  if (error || !hashed) return fail(`Couldn't create a new link: ${error?.message ?? "unknown error"}`)
  const link = authLink(hashed, "recovery", "/reset-password")
  const signInUrl = buildTicketivPublicUrl(SIGN_IN_PATH)
  const sent = await sendEmail({
    to: email,
    subject: "Your Ticketiv admin invite",
    text: `Here is a new link to choose your password (it works once):\n\n${link}\n\nAfter that, sign in at ${signInUrl}`,
    html: `<p>Here is a new link to choose your password (it works once).</p><p><a href="${link}">Choose your password</a></p><p>After that, sign in at <a href="${signInUrl}">${signInUrl}</a>.</p>`,
  })
  await audit(g.admin, g.context.user.id, {
    action: "manage_team",
    table: "admin_users",
    recordId: userId,
    summary: "Admin invite resent",
    details: { delivery: sent.status },
  })
  if (sent.status !== "sent") return fail("The email couldn't be sent.")
  return done(`New link sent to ${email}.`)
}

async function ownerCount(admin: Admin) {
  const { count } = await admin.from("admin_users").select("user_id", { count: "exact", head: true }).eq("role_tier", "super_admin").eq("active", true)
  return count ?? 0
}

export async function changeAdminRoleAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("manage_team", formData, false)
  if (!g.ok) return g.error
  const userId = field(formData, "userId")
  const role = field(formData, "role") as AdminRoleTier
  if (!isUuid(userId)) return fail("Account not found.")
  if (userId === g.context.user.id) return fail("You can't change your own role.")
  if (!INVITABLE_ROLES.includes(role)) return fail("Pick a role.")

  const { data: current } = await g.admin.from("admin_users").select("role_tier").eq("user_id", userId).maybeSingle()
  if (!current) return fail("That person isn't an admin.")
  if (current.role_tier === "super_admin" && (await ownerCount(g.admin)) <= 1) return fail("There must always be at least one owner.")

  const { error } = await g.admin.from("admin_users").update({ role_tier: role }).eq("user_id", userId)
  if (error) return fail(`Couldn't change the role: ${error.message}`)
  await audit(g.admin, g.context.user.id, {
    action: "manage_team",
    table: "admin_users",
    recordId: userId,
    summary: `Role changed from ${current.role_tier} to ${role}`,
    details: { previous_role: current.role_tier, role },
  })
  revalidatePath("/super-admin/team")
  return done("Role changed.")
}

export async function removeAdminAccessAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const g = await gate("manage_team", formData, false)
  if (!g.ok) return g.error
  const userId = field(formData, "userId")
  if (!isUuid(userId)) return fail("Account not found.")
  if (userId === g.context.user.id) return fail("You can't remove your own access.")

  const { data: current } = await g.admin.from("admin_users").select("role_tier, active").eq("user_id", userId).maybeSingle()
  if (!current?.active) return fail("That person doesn't have access.")
  if (current.role_tier === "super_admin" && (await ownerCount(g.admin)) <= 1) return fail("There must always be at least one owner.")

  const { error } = await g.admin.from("admin_users").update({ active: false }).eq("user_id", userId)
  if (error) return fail(`Couldn't remove access: ${error.message}`)
  // End their sessions so an open console tab stops working.
  const db = g.admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any }
  await db.rpc("admin_revoke_user_sessions", { p_user_id: userId })

  await audit(g.admin, g.context.user.id, {
    action: "manage_team",
    table: "admin_users",
    recordId: userId,
    summary: "Admin access removed",
    details: { previous_role: current.role_tier },
  })
  revalidatePath("/super-admin/team")
  return done("Access removed. Their account still works on the public site.")
}
