"use client"

import * as React from "react"
import { Icon } from "@/components/quiet/ui/icon"
import { Button } from "@/components/quiet/ui/button"

export interface PromoResult {
  promoId: string
  discountType: "percent" | "fixed"
  discountValue: number
}

interface PromoCodeInputProps {
  eventId: string
  onApply: (result: PromoResult | null) => void
}

export function PromoCodeInput({ eventId, onApply }: PromoCodeInputProps) {
  const [open, setOpen] = React.useState(false)
  const [code, setCode] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [applied, setApplied] = React.useState<PromoResult | null>(null)

  async function handleApply() {
    if (!code.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/orders/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), eventId }),
      })
      const json = await res.json()
      if (json.valid) {
        setApplied(json)
        onApply(json)
        setError(null)
      } else {
        setError(json.error ?? "Invalid code")
        onApply(null)
      }
    } catch {
      setError("Could not validate code")
    } finally {
      setLoading(false)
    }
  }

  function handleRemove() {
    setApplied(null)
    setCode("")
    setError(null)
    onApply(null)
  }

  if (applied) {
    const label =
      applied.discountType === "percent"
        ? `${applied.discountValue}% off`
        : `SZL ${(applied.discountValue / 100).toFixed(2)} off`
    return (
      <div className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-accent-soft/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Icon name="check" size={14} className="text-accent" />
          <span className="text-[13px] font-semibold text-accent">Code applied — {label}</span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="font-mono text-[10px] uppercase text-ink-3 hover:text-ink"
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-ink"
      >
        <Icon name="plus" size={11} />
        {open ? "Hide" : "Have a promo code?"}
      </button>
      {open && (
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleApply()}
            placeholder="PROMO CODE"
            className="flex-1 rounded-[var(--radius)] border border-line bg-bg px-3 py-2 font-mono text-[13px] uppercase tracking-wider placeholder:text-ink-4 focus:border-line-2 focus:outline-none"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleApply}
            disabled={loading || !code.trim()}
          >
            {loading ? "…" : "Apply"}
          </Button>
        </div>
      )}
      {error && (
        <p className="mt-1.5 font-mono text-[11px] text-danger">{error}</p>
      )}
    </div>
  )
}
