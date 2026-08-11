"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { reconcileRefundAction } from "./refund-reconciliation-actions"

export function RefundReconcileButton({
  orgId,
  eventId,
  orderId,
  refundId,
}: {
  orgId: string
  eventId: string
  orderId: string
  refundId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function refresh() {
    setBusy(true)
    setError("")
    try {
      await reconcileRefundAction(orgId, eventId, orderId, refundId)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to refresh refund status")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={refresh}
        className="rounded-[var(--radius)] border border-line-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 transition hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {busy ? "Checking…" : "Refresh Paystack"}
      </button>
      {error && <p className="max-w-64 text-right font-mono text-[10px] text-danger">{error}</p>}
    </div>
  )
}
