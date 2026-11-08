import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

type Admin = ReturnType<typeof createAdminClient>

export type ReceiptClaim =
  /** Already processed: answer the provider with a duplicate acknowledgement. */
  | { kind: "duplicate" }
  /** An unprocessed audit row now exists for this delivery; process it. */
  | { kind: "claimed"; id: string }
  /** The audit table could not be read or written; the provider should retry. */
  | { kind: "error"; stage: "check" | "record"; error: unknown }

/**
 * Record one provider delivery in `webhooks`, deduplicated by
 * (provider, provider_event_id). A redelivery of an unprocessed event reuses
 * its row, and a concurrent delivery that wins the unique insert is recovered
 * rather than failing, so provider retries always converge on one row.
 */
export async function claimWebhookReceipt(
  admin: Admin,
  input: { provider: string; eventId: string; signature: string | null; payload: Record<string, unknown> },
): Promise<ReceiptClaim> {
  const { data: existing, error: existingError } = await admin
    .from("webhooks")
    .select("id, processed_at")
    .eq("provider", input.provider)
    .eq("provider_event_id", input.eventId)
    .maybeSingle()

  if (existingError) return { kind: "error", stage: "check", error: existingError }
  if (existing?.processed_at) return { kind: "duplicate" }
  if (existing?.id) return { kind: "claimed", id: existing.id }

  const { data: inserted, error: insertError } = await admin
    .from("webhooks")
    .insert({
      provider: input.provider,
      signature: input.signature,
      payload: input.payload as never,
      provider_event_id: input.eventId,
    })
    .select("id")
    .single()

  if (inserted && !insertError) return { kind: "claimed", id: inserted.id }

  if (insertError?.code === "23505") {
    const { data: raced, error: raceError } = await admin
      .from("webhooks")
      .select("id, processed_at")
      .eq("provider", input.provider)
      .eq("provider_event_id", input.eventId)
      .single()
    if (raceError || !raced) return { kind: "error", stage: "record", error: raceError }
    if (raced.processed_at) return { kind: "duplicate" }
    return { kind: "claimed", id: raced.id }
  }

  return { kind: "error", stage: "record", error: insertError }
}

/** Mark a claimed delivery processed. Throws so the provider retries if the audit write fails. */
export async function markWebhookProcessed(admin: Admin, receiptId: string, failureMessage: string): Promise<void> {
  const { error } = await admin
    .from("webhooks")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", receiptId)
  if (error) {
    console.error(failureMessage, error)
    throw new Error(failureMessage)
  }
}
