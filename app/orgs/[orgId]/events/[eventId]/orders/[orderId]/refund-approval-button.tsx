"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { approveRefundAction } from "../actions"

export function RefundApprovalButton({
  orgId,
  eventId,
  refundId,
  amountLabel,
}: {
  orgId: string
  eventId: string
  refundId: string
  amountLabel: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function approve() {
    if (!confirm(`Approve ${amountLabel} and start this refund with its payment provider?`)) return
    setBusy(true)
    setError("")
    try {
      await approveRefundAction(orgId, eventId, refundId)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to start refund")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={approve}
        className="rounded-[var(--radius)] border border-line-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {busy ? "Starting…" : "Approve refund"}
      </button>
      {error && <p className="max-w-56 text-right font-mono text-[10px] text-danger">{error}</p>}
    </div>
  )
}
