"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sendEmail } from "@/lib/notifications/channels/email"

// TICK-236 — "Email attendees" compose action.
//
// Organizer-facing broadcast to an event's ticket holders. Hard rules:
//   * Recipient emails are resolved server-side and NEVER returned to the
//     browser in bulk — the preview exposes at most the first 5 addresses
//     (an AC), and the send result returns counts only.
//   * Send is gated to organizer_owner / organizer_admin (re-checked in the
//     SECURITY DEFINER RPC that also enforces the per-event hourly rate limit).
//   * Dispatch goes through the existing Resend email channel
//     (`lib/notifications/channels/email.ts`), which gracefully reports
//     "skipped" when RESEND_API_KEY is absent (dev) — the broadcast is still
//     recorded and counts as attempted so the UI stays honest.

export type EmailAudience =
  | "all"
  | "checked_in"
  | "not_checked_in"
  | string // ticket-type id (specific ticket type)

const PREVIEW_LIMIT = 5
const MAX_SUBJECT = 200
const MAX_BODY = 10_000

const OWNER_ADMIN_ROLES = new Set(["organizer_owner", "organizer_admin"])

type AuthedContext = {
  supabase: NonNullable<ReturnType<typeof createServerSupabaseClient>>
  userId: string
}

async function requireOwnerOrAdmin(orgId: string, eventId: string): Promise<AuthedContext> {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Not authenticated")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (!member || !OWNER_ADMIN_ROLES.has(String(member.role))) {
    throw new Error("Forbidden: org owner or admin role required")
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) throw new Error("Event not found")

  return { supabase, userId: session.user.id }
}

/**
 * Resolve the distinct recipient email addresses for an audience, server-side.
 * One address per person (deduped, case-insensitive). Falls back to the buyer
 * email when an item has no holder email.
 */
async function resolveRecipients(
  ctx: AuthedContext,
  orgId: string,
  eventId: string,
  audience: EmailAudience,
): Promise<string[]> {
  let q = ctx.supabase
    .from("order_items")
    .select(
      `holder_email, checked_in_at, status, ticket_type_id,
       ticket_types!inner(event_id),
       orders!inner(buyer_email, email, org_id, status)`,
    )
    .eq("ticket_types.event_id", eventId)
    .eq("orders.org_id", orgId)
    // Only live, paid tickets — exclude revoked/refunded/transferred holders.
    .in("status", ["issued", "checked_in"])
    .limit(20_000)

  if (audience === "checked_in") {
    q = q.not("checked_in_at", "is", null)
  } else if (audience === "not_checked_in") {
    q = q.is("checked_in_at", null)
  } else if (audience !== "all") {
    // Specific ticket type id.
    q = q.eq("ticket_type_id", audience)
  }

  const { data, error } = await q
  if (error) throw new Error(error.message)

  const seen = new Set<string>()
  const emails: string[] = []
  for (const row of (data ?? []) as any[]) {
    const raw: string | null =
      row.holder_email ?? row.orders?.buyer_email ?? row.orders?.email ?? null
    if (!raw) continue
    const email = raw.trim().toLowerCase()
    if (!email || !email.includes("@")) continue
    if (seen.has(email)) continue
    seen.add(email)
    emails.push(email)
  }
  return emails
}

export interface AudiencePreview {
  count: number
  sample: string[]
  error?: string
}

/**
 * Recipient count + first-5 email preview for the chosen audience (AC).
 * Gated; resolves server-side. Returns at most PREVIEW_LIMIT addresses.
 */
export async function previewAttendeeAudienceAction(
  orgId: string,
  eventId: string,
  audience: EmailAudience,
): Promise<AudiencePreview> {
  try {
    const ctx = await requireOwnerOrAdmin(orgId, eventId)
    const emails = await resolveRecipients(ctx, orgId, eventId, audience)
    return { count: emails.length, sample: emails.slice(0, PREVIEW_LIMIT) }
  } catch (err: any) {
    return { count: 0, sample: [], error: err?.message ?? "Unable to load audience" }
  }
}

export interface EmailAttendeesResult {
  sentCount: number
  skippedCount: number
  failedCount: number
  recipientCount: number
  delivered: boolean
  error?: string
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  )
}

/** Plain-text body → minimal branded HTML (paragraphs from line breaks). */
function bodyToHtml(eventTitle: string, body: string): string {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.55">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("")
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;margin:0 auto;color:#0a0a0c;font-size:14px">
    <p style="color:#6b6b70;margin:0 0 16px;font-size:12px;text-transform:uppercase;letter-spacing:.05em">${escapeHtml(eventTitle)}</p>
    ${paragraphs}
  </div>`
}

/**
 * Send a broadcast email to the resolved audience for an event.
 * Returns counts only — recipient addresses never leave the server.
 */
export async function emailAttendeesAction(
  orgId: string,
  eventId: string,
  audience: EmailAudience,
  subject: string,
  body: string,
): Promise<EmailAttendeesResult> {
  const empty: EmailAttendeesResult = {
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    recipientCount: 0,
    delivered: false,
  }

  let ctx: AuthedContext
  try {
    ctx = await requireOwnerOrAdmin(orgId, eventId)
  } catch (err: any) {
    return { ...empty, error: err?.message ?? "Forbidden" }
  }

  const trimmedSubject = subject.trim()
  const trimmedBody = body.trim()
  if (!trimmedSubject) return { ...empty, error: "Subject is required" }
  if (!trimmedBody) return { ...empty, error: "Message body is required" }
  if (trimmedSubject.length > MAX_SUBJECT) return { ...empty, error: "Subject is too long" }
  if (trimmedBody.length > MAX_BODY) return { ...empty, error: "Message body is too long" }

  let recipients: string[]
  try {
    recipients = await resolveRecipients(ctx, orgId, eventId, audience)
  } catch (err: any) {
    return { ...empty, error: err?.message ?? "Unable to resolve recipients" }
  }

  if (recipients.length === 0) {
    return { ...empty, error: "No recipients for the selected audience" }
  }

  // Event title for the email header.
  const { data: event } = await ctx.supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle()
  const eventTitle = (event as any)?.title ?? "Your event"

  // Claim the rate-limit slot + record the audit row (RPC re-checks role and
  // enforces max 1 broadcast per event per hour, atomically).
  const { data: notificationId, error: claimError } = await (ctx.supabase.rpc as any)(
    "fn_claim_email_broadcast",
    {
      p_org_id: orgId,
      p_event_id: eventId,
      p_recipient_count: recipients.length,
      p_audience: String(audience),
      p_subject: trimmedSubject,
    },
  )

  if (claimError) {
    return { ...empty, recipientCount: recipients.length, error: claimError.message }
  }

  const html = bodyToHtml(eventTitle, trimmedBody)
  const text = trimmedBody

  let sentCount = 0
  let skippedCount = 0
  let failedCount = 0

  // Best-effort per-recipient dispatch through the existing email channel.
  for (const to of recipients) {
    try {
      const result = await sendEmail({ to, subject: trimmedSubject, html, text })
      if (result.status === "sent") sentCount += 1
      else if (result.status === "skipped") skippedCount += 1
      else failedCount += 1
    } catch {
      failedCount += 1
    }
  }

  // Finalize the audit row with the realized counts (best-effort).
  await (ctx.supabase.rpc as any)("fn_finalize_email_broadcast", {
    p_notification_id: notificationId,
    p_sent_count: sentCount,
    p_failed_count: failedCount,
  })

  return {
    sentCount,
    skippedCount,
    failedCount,
    recipientCount: recipients.length,
    delivered: sentCount > 0,
  }
}
