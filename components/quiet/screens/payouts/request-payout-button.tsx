"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"

interface RequestPayoutButtonProps {
  orgId: string
  availableMinor: number
  currency: string
  /** Disabled when there's no payout account or no eligible balance. */
  eligible: boolean
  blockedReason: string | null
}

function formatMoney(minor: number, currency: string): string {
  return `${currency} ${(Math.abs(minor) / 100).toLocaleString("en", { maximumFractionDigits: 0 })}`
}

export function RequestPayoutButton({ orgId, availableMinor, currency, eligible, blockedReason }: RequestPayoutButtonProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState(() => String(Math.max(0, Math.floor(availableMinor / 100))))
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit() {
    setError(null)
    const major = Number(amount)
    if (!Number.isFinite(major) || major <= 0) {
      setError("Enter an amount greater than zero.")
      return
    }
    const amountCents = Math.round(major * 100)
    if (amountCents > availableMinor) {
      setError("That's more than your available balance.")
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch("/api/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, amountCents }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data?.error ?? "Unable to request payout")
        setSubmitting(false)
        return
      }
      setOpen(false)
      setSubmitting(false)
      router.refresh()
    } catch {
      setError("Network error. Try again.")
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button variant="accent" size="xs" disabled={!eligible} onClick={() => setOpen(true)} title={blockedReason ?? undefined}>
        <Icon name="arrowUR" size={12} /> Request payout
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="w-full max-w-[380px] rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-h3">Request payout</h2>
              <p className="text-[13px] text-ink-3">
                Available balance {formatMoney(availableMinor, currency)}.
              </p>
            </div>

            <label className="mt-4 flex flex-col gap-1">
              <span className="text-label">Amount ({currency})</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  if (error) setError(null)
                }}
                className="rounded-md border border-line-2 bg-surface px-3 py-2.5 font-mono text-[16px] text-ink outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                autoFocus
              />
            </label>

            {error && (
              <p role="alert" className="mt-2 text-[12px] text-danger">
                {error}
              </p>
            )}

            <div className="mt-5 flex items-center gap-2">
              <Button variant="default" size="sm" className="flex-1" onClick={() => setOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" className="flex-1" onClick={submit} disabled={submitting}>
                {submitting ? "Requesting…" : "Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
