import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

import { evaluatePushResponse, shouldRetireToken, type ProviderResponse, type PushService } from "./outcome"

// Provider-neutral native push dispatch.
//
// Resolving *who* to send to, and cleaning up after the provider answers, is
// the same work whichever rail carries the message — so it lives here once, and
// the rails supply only "post this payload to this token".
//
// The sender is injected rather than imported. That is what lets this be tested
// without credentials or a network, and it is also why the FCM/APNs/HMS clients
// can land later without this file changing.

export interface PushMessage {
  title: string
  body: string
  /** Consumed by the app to route the tap. Values must be strings — every rail flattens data payloads. */
  data?: Record<string, string>
}

export interface PushTarget {
  service: PushService
  token: string
  deviceId: string
}

/** A rail: hand the payload to the provider and report the raw response. */
export type PushSender = (
  target: PushTarget,
  message: PushMessage,
) => Promise<ProviderResponse | { skipped: true; reason: string }>

export interface DispatchSummary {
  targets: number
  delivered: number
  retryable: number
  failed: number
  retired: number
  skipped: number
}

const EMPTY: DispatchSummary = {
  targets: 0,
  delivered: 0,
  retryable: 0,
  failed: 0,
  retired: 0,
  skipped: 0,
}

/**
 * Send one notification to every live device a user has, for a notification
 * type they have not muted.
 *
 * Target resolution and the mute check are done by fn_push_targets_for_user, so
 * a caller cannot bypass a user's preferences by reading push_devices directly.
 * Never throws: a push failure must not take down the surrounding flow
 * (checkout, waitlist offers), which is the same contract the email/SMS
 * channels follow.
 */
export async function dispatchPushToUser(input: {
  userId: string
  notificationType: string
  message: PushMessage
  senders: Partial<Record<PushService, PushSender>>
}): Promise<DispatchSummary> {
  const summary: DispatchSummary = { ...EMPTY }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    console.error("[push] admin client unavailable", error)
    return summary
  }

  const { data, error } = await (admin.rpc as any)("fn_push_targets_for_user", {
    p_user_id: input.userId,
    p_notification_type: input.notificationType,
  })

  if (error) {
    console.error("[push] target lookup failed", error)
    return summary
  }

  const targets: PushTarget[] = ((data ?? []) as Array<Record<string, string>>)
    .map((row) => ({
      service: row.service as PushService,
      token: row.token,
      deviceId: row.device_id,
    }))
    .filter((t) => t.service && t.token)

  summary.targets = targets.length
  if (targets.length === 0) return summary

  // Tokens retired in this pass, so two devices sharing a dead token do not
  // each issue their own retirement call.
  const retired = new Set<string>()

  for (const target of targets) {
    const sender = input.senders[target.service]
    if (!sender) {
      summary.skipped += 1
      continue
    }

    let response: ProviderResponse | { skipped: true; reason: string }
    try {
      response = await sender(target, input.message)
    } catch (error) {
      // A rail throwing is transient by default — a thrown fetch is a network
      // problem, not evidence the registration is gone. Never retire on it.
      summary.retryable += 1
      console.error(`[push] ${target.service} sender threw`, error)
      continue
    }

    if ("skipped" in response) {
      summary.skipped += 1
      continue
    }

    const outcome = evaluatePushResponse(target.service, response)

    switch (outcome.kind) {
      case "delivered":
        summary.delivered += 1
        break
      case "retry":
        summary.retryable += 1
        break
      case "failed":
        summary.failed += 1
        console.error(`[push] ${target.service} send failed: ${outcome.reason}`)
        break
      case "token_dead":
        summary.failed += 1
        break
    }

    if (shouldRetireToken(outcome)) {
      const key = `${target.service}:${target.token}`
      if (retired.has(key)) continue
      retired.add(key)

      const { error: retireError } = await (admin.rpc as any)("fn_disable_push_device_token", {
        p_service: target.service,
        p_token: target.token,
        p_reason: outcome.reason,
      })

      if (retireError) console.error("[push] could not retire dead token", retireError)
      else summary.retired += 1
    }
  }

  return summary
}
