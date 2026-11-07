// Pure pieces of the reminder emails, so they can be unit tested.

export const REMINDER_TYPES = ["event_reminder", "saved_event_reminder"]

export interface ReminderRow {
  id: string
  user_id: string | null
  type: string
  payload: Record<string, unknown> | null
  dedupe_key: string
  created_at: string
}

export function emailDedupeKey(inAppKey: string): string {
  return `email:${inAppKey}`
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "")

/** Subject, HTML and plain text for one reminder. Links stay on our own site. */
export function buildReminderEmail(reminder: ReminderRow, appUrl: string): { subject: string; html: string; text: string } {
  const payload = reminder.payload ?? {}
  const saved = reminder.type === "saved_event_reminder"
  const eventTitle = text(payload.eventTitle) || "your event"
  const subject = text(payload.title) || (saved ? `Coming up: ${eventTitle}` : `Reminder: ${eventTitle}`)
  const body = text(payload.body) || (saved ? "An event you saved is coming up." : "Your event is coming up.")
  const href = text(payload.href)
  // Only relative paths from our own reminder job; anything else falls back to My tickets.
  const path = href.startsWith("/") && !href.startsWith("//") ? href : "/tickets"
  const url = `${appUrl.replace(/\/+$/, "")}${path}`
  const cta = saved ? "View event" : "Open your ticket and event guide"

  const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#fafafa;font-family:Inter,Arial,sans-serif;color:#0a0a0c">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#6e6c70">Ticketiv</p>
  <h1 style="margin:0 0 12px;font-size:22px;line-height:1.25">${escapeHtml(subject)}</h1>
  <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#2a2a2e">${escapeHtml(body)}</p>
  <a href="${escapeHtml(url)}" style="display:inline-block;background:#6b3fbd;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 18px;border-radius:10px">${escapeHtml(cta)}</a>
  <p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#6e6c70">You get this because event reminders are on in your Ticketiv account. Turn them off in Me › Reminders.</p>
</div></body></html>`

  return {
    subject,
    html,
    text: `${subject}\n\n${body}\n\n${cta}: ${url}\n\nTurn reminders off in Me › Reminders.`,
  }
}
