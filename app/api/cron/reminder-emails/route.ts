import { NextResponse } from "next/server"

import { APP_URL } from "@/lib/env"
import { sendPendingCompanionPushes } from "@/lib/notifications/companion-push"
import { sendPendingReminderEmails } from "@/lib/notifications/reminder-emails"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/cron/reminder-emails — called hourly by pg_cron
 * (fn_reminder_emails_tick) with the shared CRON_SECRET. Emails the event
 * reminders the database job just wrote, once each, and pushes Event
 * Companion notifications to devices that opted in.
 */
export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const [email, push] = await Promise.all([
    sendPendingReminderEmails(APP_URL),
    sendPendingCompanionPushes({ sinceMs: 3 * 60 * 60 * 1000 }),
  ])
  return NextResponse.json({ ok: true, email, push })
}
