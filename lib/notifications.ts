import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

type NotificationType =
  | "ticket_purchase_succeeded"
  | "payment_succeeded"
  | "payment_failed"
  | "event_published"
  | "event_changed"
  | "refund_updated"
  | "payout_updated"
  | "ticket_transfer_updated"

export async function emitNotification(input: {
  userId?: string | null
  type: NotificationType | string
  payload?: Record<string, any>
  channel?: string | null
  dedupeKey?: string | null
  scheduledAt?: string | null
}) {
  const admin = createAdminClient()
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId ?? null,
    type: input.type,
    payload: input.payload ?? {},
    status: "pending",
    channel: input.channel ?? "in_app",
    dedupe_key: input.dedupeKey ?? null,
    scheduled_at: input.scheduledAt ?? null,
  })

  if (error) {
    console.error("Failed to emit notification", error)
  }
}

export async function emitOrgMemberNotifications(input: {
  orgId: string
  type: NotificationType | string
  payload?: Record<string, any>
  roles?: string[]
  dedupePrefix?: string
}) {
  const admin = createAdminClient()
  let query = admin.from("org_members").select("user_id, role").eq("org_id", input.orgId)
  if (input.roles?.length) query = query.in("role", input.roles as any)

  const { data: members, error } = await query
  if (error) {
    console.error("Failed to load org members for notification", error)
    return
  }

  await Promise.all(
    (members ?? []).map((member) =>
      emitNotification({
        userId: member.user_id,
        type: input.type,
        payload: input.payload,
        dedupeKey: input.dedupePrefix ? `${input.dedupePrefix}:${member.user_id}` : null,
      }),
    ),
  )
}

export async function notifyTicketPurchaseSucceeded(input: {
  userId: string
  orderId: string
  orgId: string
  amountCents: number
  currency: string
  ticketCount?: number
}) {
  await emitNotification({
    userId: input.userId,
    type: "ticket_purchase_succeeded",
    payload: input,
    dedupeKey: `ticket_purchase_succeeded:${input.orderId}:${input.userId}`,
  })
}

export async function notifyPaymentSucceeded(input: { userId: string; orderId: string; paymentId: string; amountCents: number; currency: string }) {
  await emitNotification({
    userId: input.userId,
    type: "payment_succeeded",
    payload: input,
    dedupeKey: `payment_succeeded:${input.paymentId}:${input.userId}`,
  })
}

export async function notifyPaymentFailed(input: { userId?: string | null; orderId: string; provider: string; reference?: string | null }) {
  await emitNotification({
    userId: input.userId,
    type: "payment_failed",
    payload: input,
    dedupeKey: `payment_failed:${input.orderId}:${input.reference ?? "unknown"}`,
  })
}

export async function notifyEventPublished(input: { orgId: string; eventId: string; title: string; actorId?: string | null }) {
  await emitOrgMemberNotifications({
    orgId: input.orgId,
    type: "event_published",
    payload: input,
    roles: ["organizer_owner", "organizer_admin", "organizer", "admin"],
    dedupePrefix: `event_published:${input.eventId}`,
  })
}

export async function notifyEventChanged(input: { orgId: string; eventId: string; title?: string | null; changeType: string; actorId?: string | null; changes?: Record<string, any> }) {
  await emitOrgMemberNotifications({
    orgId: input.orgId,
    type: "event_changed",
    payload: input,
    roles: ["organizer_owner", "organizer_admin", "organizer", "admin"],
    dedupePrefix: `event_changed:${input.eventId}:${input.changeType}`,
  })
}

export async function notifyRefundUpdated(input: { userId?: string | null; refundId: string; status: string; amountCents?: number; currency?: string }) {
  await emitNotification({
    userId: input.userId,
    type: "refund_updated",
    payload: input,
    dedupeKey: `refund_updated:${input.refundId}:${input.status}:${input.userId ?? "org"}`,
  })
}

export async function notifyPayoutUpdated(input: { orgId: string; payoutId: string; status: string; amountCents?: number; currency?: string }) {
  await emitOrgMemberNotifications({
    orgId: input.orgId,
    type: "payout_updated",
    payload: input,
    roles: ["organizer_owner", "organizer_admin", "finance", "admin"],
    dedupePrefix: `payout_updated:${input.payoutId}:${input.status}`,
  })
}

export async function notifyTicketTransferUpdated(input: { fromUserId?: string | null; toUserId?: string | null; transferId: string; status: string; orderItemId?: string | null }) {
  await Promise.all([
    input.fromUserId
      ? emitNotification({ userId: input.fromUserId, type: "ticket_transfer_updated", payload: { ...input, audience: "sender" }, dedupeKey: `transfer:${input.transferId}:${input.status}:sender` })
      : Promise.resolve(),
    input.toUserId
      ? emitNotification({ userId: input.toUserId, type: "ticket_transfer_updated", payload: { ...input, audience: "recipient" }, dedupeKey: `transfer:${input.transferId}:${input.status}:recipient` })
      : Promise.resolve(),
  ])
}
