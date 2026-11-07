import "server-only"

import { buildCompanionPush, pushDedupeKey, PUSH_TYPES, REMINDER_SWITCH_TYPES, type ReminderRow } from "@/lib/notifications/reminder-email-template"
import { isPushSendingConfigured, sendPushToUser } from "@/lib/push/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Web Push copies of Event Companion notifications (reminders, organiser
 * updates, "How was it?", new events from followed organisers).
 *
 * Each in-app notification is pushed at most once (logged as its own row,
 * channel "push", dedupe "push:<in-app key>"), only to people whose push
 * switch is on (and, for reminder types, whose event reminders are on), and
 * only to devices they opted in from. No-ops until VAPID keys are set.
 */

export interface PushRun {
  considered: number
  delivered: number
  noDevice: number
  optedOut: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (table: string) => any }

export async function sendPendingCompanionPushes(options: { sinceMs: number; types?: string[]; now?: Date }): Promise<PushRun> {
  const run: PushRun = { considered: 0, delivered: 0, noDevice: 0, optedOut: 0 }
  if (!isPushSendingConfigured()) return run

  const admin = createAdminClient() as unknown as Loose
  const now = options.now ?? new Date()
  const { data: rows, error } = await admin
    .from("notifications")
    .select("id, user_id, type, payload, dedupe_key, created_at")
    .in("type", options.types ?? PUSH_TYPES)
    .eq("channel", "in_app")
    .gte("created_at", new Date(now.getTime() - options.sinceMs).toISOString())
    .not("dedupe_key", "is", null)
    .order("created_at", { ascending: true })
    .limit(300)
  if (error) {
    console.error("[companion-push] read:", error)
    return run
  }
  const items = (rows ?? []) as ReminderRow[]
  if (!items.length) return run

  const keys = items.map((r) => pushDedupeKey(r.dedupe_key))
  const userIds = Array.from(new Set(items.map((r) => r.user_id).filter(Boolean))) as string[]
  const [doneRes, prefsRes] = await Promise.all([
    admin.from("notifications").select("dedupe_key").in("dedupe_key", keys),
    admin.from("user_notification_preferences").select("user_id, push_opt_in, event_reminders_enabled").in("user_id", userIds),
  ])
  const done = new Set(((doneRes.data ?? []) as Array<{ dedupe_key: string }>).map((r) => r.dedupe_key))
  const prefs = new Map(
    ((prefsRes.data ?? []) as Array<{ user_id: string; push_opt_in: boolean | null; event_reminders_enabled: boolean | null }>).map((p) => [p.user_id, p]),
  )

  for (const item of items) {
    const key = pushDedupeKey(item.dedupe_key)
    if (!item.user_id || done.has(key)) continue
    run.considered += 1
    const pref = prefs.get(item.user_id)
    if (pref?.push_opt_in === false || (REMINDER_SWITCH_TYPES.has(item.type) && pref?.event_reminders_enabled === false)) {
      run.optedOut += 1
      continue
    }

    const push = buildCompanionPush(item)
    let delivered = 0
    try {
      delivered = await sendPushToUser(item.user_id, push)
    } catch (err) {
      console.error("[companion-push] send:", err)
    }
    if (delivered > 0) run.delivered += 1
    else run.noDevice += 1

    // Log only real deliveries, so someone who enables push later still gets
    // anything that is still recent. The window keeps that bounded.
    if (delivered > 0) {
      const { error: logError } = await admin.from("notifications").insert({
        user_id: item.user_id,
        type: item.type,
        channel: "push",
        status: "sent",
        sent_at: new Date().toISOString(),
        dedupe_key: key,
        payload: { ...(item.payload ?? {}), devices: delivered },
      })
      if (logError && logError.code !== "23505") console.error("[companion-push] log:", logError)
    }
  }
  return run
}
