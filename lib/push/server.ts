import "server-only"

import webpush from "web-push"
import { SUPPORT_EMAIL } from "@ticketiv/shared"
import { createAdminClient } from "@/lib/supabase/admin"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? ""

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(`mailto:${SUPPORT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
  icon?: string
}

/**
 * Sends a Web Push notification to every stored subscription for a user.
 * Stale subscriptions (404/410) are removed automatically.
 * Silently no-ops when VAPID keys are not configured.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const admin = createAdminClient()
  if (!admin) return

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (error || !subs?.length) return

  const message = JSON.stringify(payload)
  const staleIds: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        )
      } catch (err: unknown) {
        const status = err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : null
        if (status === 404 || status === 410) {
          staleIds.push(sub.id)
        } else {
          console.error("[push] delivery failed", sub.endpoint.slice(0, 60), err)
        }
      }
    }),
  )

  if (staleIds.length) {
    await admin.from("push_subscriptions").delete().in("id", staleIds)
  }
}

/** Sends the waitlist offer push to a buyer. Fire-and-forget — never throws. */
export async function sendWaitlistOfferPush(params: {
  userId: string | null
  waitlistId: string
  eventTitle: string
  minutesUntilExpiry: number
}): Promise<void> {
  if (!params.userId) return
  try {
    await sendPushToUser(params.userId, {
      title: `${params.eventTitle} — A ticket is available!`,
      body: `Your offer expires in ${params.minutesUntilExpiry} min. Tap to claim your ticket.`,
      url: `/checkout/waitlist/${params.waitlistId}`,
      tag: `waitlist-offer-${params.waitlistId}`,
    })
  } catch (err) {
    console.error("[push] waitlist offer push failed", params.waitlistId, err)
  }
}
