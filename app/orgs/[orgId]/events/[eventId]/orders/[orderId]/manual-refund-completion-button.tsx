"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { completeManualRefundAction } from "./refund-reconciliation-actions"

export function ManualRefundCompletionButton({
  orgId,
  eventId,
  orderId,
  refundId,
  provider,
  amountLabel,
}: {
  orgId: string
  eventId: string
  orderId: string
  refundId: string
  provider: string
  amountLabel: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [providerReference, setProviderReference] = useState("")
  const [completionNote, setCompletionNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function complete() {
    const reference = providerReference.trim()
    const note = completionNote.trim()
    if (!reference || !note) {
      setError("Provider reference and completion note are required.")
      return
    }

    if (
      !confirm(
        `Confirm that ${amountLabel} has already been returned through ${provider}? Ticketiv will now mark the refund processed and invalidate the refunded ticket(s).`,
      )
    ) {
      return
    }

    setBusy(true)
    setError("")
    try {
      await completeManualRefundAction(
        orgId,
        eventId,
        orderId,
        refundId,
        reference,
        note,
      )
      setOpen(false)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to complete refund")
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-[var(--radius)] border border-line-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 transition hover:border-accent hover:text-accent"
      >
        Confirm refund completed
      </button>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-[var(--radius)] border border-line-2 bg-bg p-3 sm:w-80">
      <p className="text-[12px] font-semibold text-ink">Complete manual {provider} refund</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
        Use this only after the money has been returned through the provider. Completing it here will finalise the refund, ledger entry, and ticket status.
      </p>

      <label className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
        Provider refund reference
        <input
          value={providerReference}
          onChange={(event) => setProviderReference(event.target.value)}
          maxLength={200}
          disabled={busy}
          className="mt-1 w-full rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 font-mono text-[12px] normal-case tracking-normal text-ink outline-none focus:border-accent"
          placeholder="Reference / transaction ID"
        />
      </label>

      <label className="mt-3 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
        Completion note
        <textarea
          value={completionNote}
          onChange={(event) => setCompletionNote(event.target.value)}
          maxLength={1000}
          rows={3}
          disabled={busy}
          className="mt-1 w-full resize-none rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[12px] normal-case tracking-normal text-ink outline-none focus:border-accent"
          placeholder="How and where the refund was completed"
        />
      </label>

      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setOpen(false)
            setError("")
          }}
          className="rounded-[var(--radius)] border border-line-2 px-3 py-1.5 text-[11px] text-ink-3 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={complete}
          className="rounded-[var(--radius)] border border-accent px-3 py-1.5 text-[11px] font-semibold text-accent disabled:opacity-50"
        >
          {busy ? "Completing…" : "Complete refund"}
        </button>
      </div>
    </div>
  )
}
