import "server-only"

import { sendEmail } from "@/lib/notifications/channels/email"
import { buildReminderEmail, emailDedupeKey, REMINDER_TYPES, type ReminderRow } from "@/lib/notifications/reminder-email-template"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Email copies of Event Companion reminders.
 *
 * fn_companion_reminders_tick (pg_cron, hourly) writes in-app reminders. This
 * sends each one by email once, to people who haven't opted out of email or
 * event reminders. Every attempt is logged as its own notifications row
 * (channel "email", dedupe key "email:<in-app key>"), so a rerun never emails
 * twice. Called by /api/cron/reminder-emails. Never throws.
 */

export interface ReminderEmailRun {
  considered: number
  sent: number
  skipped: number
  failed: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (table: string) => any; auth: any }

export async function sendPendingReminderEmails(appUrl: string, now = new Date()): Promise<ReminderEmailRun> {
  const admin = createAdminClient() as unknown as Loose
  const run: ReminderEmailRun = { considered: 0, sent: 0, skipped: 0, failed: 0 }

  const since = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await admin
    .from("notifications")
    .select("id, user_id, type, payload, dedupe_key, created_at")
    .in("type", REMINDER_TYPES)
    .eq("channel", "in_app")
    .gte("created_at", since)
    .not("dedupe_key", "is", null)
    .order("created_at", { ascending: true })
    .limit(200)
  if (error) {
    console.error("[reminder-emails] read reminders:", error)
    return run
  }

  const reminders = (rows ?? []) as ReminderRow[]
  if (reminders.length === 0) return run

  const emailKeys = reminders.map((r) => emailDedupeKey(r.dedupe_key))
  const userIds = Array.from(new Set(reminders.map((r) => r.user_id).filter(Boolean))) as string[]
  const [doneRes, prefsRes] = await Promise.all([
    admin.from("notifications").select("dedupe_key").in("dedupe_key", emailKeys),
    admin.from("user_notification_preferences").select("user_id, email_opt_in, event_reminders_enabled").in("user_id", userIds),
  ])
  const done = new Set(((doneRes.data ?? []) as Array<{ dedupe_key: string }>).map((r) => r.dedupe_key))
  const prefs = new Map(
    ((prefsRes.data ?? []) as Array<{ user_id: string; email_opt_in: boolean | null; event_reminders_enabled: boolean | null }>).map((p) => [p.user_id, p]),
  )
  const emails = new Map<string, string | null>()

  for (const reminder of reminders) {
    const key = emailDedupeKey(reminder.dedupe_key)
    if (!reminder.user_id || done.has(key)) continue
    run.considered += 1

    const pref = prefs.get(reminder.user_id)
    if (pref?.email_opt_in === false || pref?.event_reminders_enabled === false) {
      run.skipped += 1
      continue
    }

    if (!emails.has(reminder.user_id)) {
      const { data } = await admin.auth.admin.getUserById(reminder.user_id)
      const user = data?.user
      // Guest (anonymous) checkouts have no address on the account.
      emails.set(reminder.user_id, user && !user.is_anonymous && user.email ? user.email : null)
    }
    const to = emails.get(reminder.user_id)
    if (!to) {
      run.skipped += 1
      continue
    }

    const message = buildReminderEmail(reminder, appUrl)
    const result = await sendEmail({ to, ...message })
    run[result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "failed"] += 1

    const { error: logError } = await admin.from("notifications").insert({
      user_id: reminder.user_id,
      type: reminder.type,
      channel: "email",
      status: result.status === "sent" ? "sent" : result.status === "skipped" ? "skipped" : "failed",
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
      last_error: result.status === "failed" ? result.error : result.status === "skipped" ? result.reason : null,
      dedupe_key: key,
      payload: { ...(reminder.payload ?? {}), provider: result.provider },
    })
    // A unique-key clash means another run already logged it: fine.
    if (logError && logError.code !== "23505") console.error("[reminder-emails] log:", logError)
  }

  return run
}
