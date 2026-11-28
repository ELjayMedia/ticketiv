"use client"

// TICK-214: browser Web Push opt-in helpers (client side).
//
// Standards-based Push API only — no external dependency. These helpers:
//   1. register the service worker (public/sw.js),
//   2. request notification permission contextually (called on user gesture),
//   3. subscribe via PushManager using the VAPID public key,
//   4. hand the subscription to the server to persist (storePushSubscription).
//
// The VAPID public key is fetched from /api/push/public-key at run time (so a
// key saved in the admin console works without a rebuild). Until a key is
// provisioned, capability checks report the feature as unavailable rather than
// throwing, so callers can hide/disable the opt-in affordance cleanly.

export type PushOptInResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "denied" | "unconfigured" | "error"; message: string }

let publicKeyRequest: Promise<string> | null = null

/** The server's VAPID public key, or "" when push isn't set up. Fetched once per page load. */
function getVapidPublicKey(): Promise<string> {
  publicKeyRequest ??= fetch("/api/push/public-key", { cache: "no-store" })
    .then(async (res) => (res.ok ? (((await res.json()) as { publicKey?: unknown }).publicKey ?? "") : ""))
    .then((key) => (typeof key === "string" ? key : ""))
    .catch(() => "")
  return publicKeyRequest
}

/** True when the browser exposes the APIs Web Push needs. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

/** True when a VAPID key is configured (i.e. the server sender can be wired up). */
export async function isPushConfigured(): Promise<boolean> {
  return (await getVapidPublicKey()).length > 0
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  const buffer = new ArrayBuffer(raw.length)
  const output = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/sw.js")
  if (existing) return existing
  return navigator.serviceWorker.register("/sw.js")
}

/**
 * Request permission, subscribe, and persist the subscription. Must be called
 * from a user gesture (contextual opt-in — never on page load).
 *
 * `persist` is injected by the caller (a server action) so this file stays
 * client-only and the network call goes through the SECURITY DEFINER RPC.
 */
export async function enableWaitlistPush(
  persist: (sub: {
    endpoint: string
    p256dh: string
    auth: string
    userAgent: string
  }) => Promise<{ ok: boolean; error?: string }>,
): Promise<PushOptInResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported", message: "Push notifications are not supported on this device." }
  }
  const vapidPublicKey = await getVapidPublicKey()
  if (!vapidPublicKey) {
    return {
      ok: false,
      reason: "unconfigured",
      message: "Push notifications are not yet available. We'll still notify you in the app.",
    }
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      return { ok: false, reason: "denied", message: "Notifications are blocked. You can enable them in your browser settings." }
    }

    const registration = await registerServiceWorker()
    await navigator.serviceWorker.ready

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      }))

    const json = subscription.toJSON()
    const keys = json.keys ?? {}
    if (!json.endpoint || !keys.p256dh || !keys.auth) {
      return { ok: false, reason: "error", message: "Could not read the push subscription." }
    }

    const result = await persist({
      endpoint: json.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: navigator.userAgent,
    })

    if (!result.ok) {
      return { ok: false, reason: "error", message: result.error ?? "Could not save your subscription." }
    }

    return { ok: true }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not enable push notifications."
    return { ok: false, reason: "error", message }
  }
}
