import "server-only"

import webpush from "web-push"
import { SUPPORT_EMAIL } from "@ticketiv/shared"
import { resolveIntegration } from "@/lib/integrations/runtime"
import { createAdminClient } from "@/lib/supabase/admin"

// VAPID keys come from the admin console (Integrations › Web Push) when saved
// there, else NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY. They're read at
// send time and passed per request, so a change needs no redeploy.

export interface VapidKeys {
  publicKey: string
  privateKey: string
}

/** The VAPID pair in use, or null when push is switched off or not set up. */
export async function getVapidKeys(): Promise<VapidKeys | null> {
  const resolved = await resolveIntegration("web_push")
  if (resolved.source === "off") return null
  const publicKey = resolved.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? ""
  const privateKey = resolved.env.VAPID_PRIVATE_KEY?.trim() ?? ""
  return publicKey && privateKey ? { publicKey, privateKey } : null
}

/** Throws when the pair isn't a valid VAPID key pair (web-push validates lengths and encoding). */
export function assertVapidKeys(keys: VapidKeys) {
  webpush.getVapidHeaders("https://fcm.googleapis.com", `mailto:${SUPPORT_EMAIL}`, keys.publicKey, keys.privateKey, "aes128gcm")
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
  icon?: string
}

/** True when the server can send Web Push (both VAPID keys are set and push is on). */
export async function isPushSendingConfigured(): Promise<boolean> {
  return (await getVapidKeys()) !== null
}

/**
 * Sends a Web Push notification to every stored subscription for a user.
 * Stale subscriptions (404/410) are removed automatically.
 * Silently no-ops when VAPID keys are not configured.
 * Returns how many devices accepted it.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  const keys = await getVapidKeys()
  if (!keys) return 0
  const vapidDetails = { subject: `mailto:${SUPPORT_EMAIL}`, publicKey: keys.publicKey, privateKey: keys.privateKey }

  const admin = createAdminClient()
  if (!admin) return 0

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (error || !subs?.length) return 0

  const message = JSON.stringify(payload)
  const staleIds: string[] = []
  let delivered = 0

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
          { vapidDetails },
        )
        delivered += 1
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
  return delivered
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
