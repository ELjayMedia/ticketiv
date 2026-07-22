"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { revokeTicketAction, initiateRefundAction } from "../actions"

export function OrderSupportActions({
  orgId,
  eventId,
  orderId,
  orderItemId,
  itemStatus,
  itemPriceCents,
  currency,
}: {
  orgId: string
  eventId: string
  orderId: string
  orderItemId: string
  itemStatus: string
  itemPriceCents: number
  currency: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const canRevoke = itemStatus === "issued" || itemStatus === "checked_in"
  const canRefund = itemStatus === "issued" || itemStatus === "checked_in"

  async function handleRevoke() {
    if (!confirm("Revoke this ticket? The holder will no longer be able to check in.")) return
    setBusy(true)
    setError("")
    try {
      await revokeTicketAction(orgId, eventId, orderItemId)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Failed to revoke ticket")
    } finally {
      setBusy(false)
    }
  }

  async function handleRefund() {
    const defaultAmount = (itemPriceCents / 100).toFixed(2)
    const amountInput = prompt(
      `Refund amount in ${currency}. Enter the full ticket amount or a smaller partial amount:`,
      defaultAmount,
    )
    if (!amountInput) return

    const amount = Number(amountInput.replace(/,/g, ""))
    const amountCents = Math.round(amount * 100)
    if (!Number.isFinite(amount) || amountCents <= 0) {
      setError("Enter a valid refund amount greater than zero")
      return
    }

    const reason = prompt("Reason for refund (required):")
    if (!reason?.trim()) return

    const label = amountCents === itemPriceCents ? "full" : "partial"
    if (!confirm(`Request a ${label} refund of ${currency} ${(amountCents / 100).toFixed(2)}?`)) return

    setBusy(true)
    setError("")
    try {
      await initiateRefundAction(orgId, eventId, orderItemId, amountCents, reason)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? "Failed to initiate refund")
    } finally {
      setBusy(false)
    }
  }

  if (!canRevoke && !canRefund) return null

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {canRevoke && (
          <button
            type="button"
            disabled={busy}
            onClick={handleRevoke}
            className="rounded-[var(--radius)] border border-line-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 transition hover:border-danger hover:text-danger disabled:opacity-50"
          >
            Revoke
          </button>
        )}
        {canRefund && (
          <button
            type="button"
            disabled={busy}
            onClick={handleRefund}
            className="rounded-[var(--radius)] border border-line-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 transition hover:border-warning hover:text-warning disabled:opacity-50"
          >
            Request refund
          </button>
        )}
      </div>
      {error && <p className="font-mono text-[11px] text-danger">{error}</p>}
    </div>
  )
}
