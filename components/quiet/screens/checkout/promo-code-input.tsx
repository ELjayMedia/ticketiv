"use client"

import * as React from "react"
import { Icon } from "@/components/quiet/ui/icon"
import { Button } from "@/components/quiet/ui/button"

/**
 * A promo code the server has previewed for this event. `code` is what the
 * buyer typed and what checkout sends; the discount fields only drive the
 * on-screen estimate. fn_apply_promo_code_to_order stays the enforcement layer
 * when the order is created.
 */
export interface AppliedPromo {
  code: string
  discountType: "percent" | "fixed"
  discountValue: number
}

/** On-screen estimate of a previewed promo, in minor units, never above the subtotal. */
export function promoDiscountMinor(promo: AppliedPromo | null, subtotalMinor: number): number {
  if (!promo) return 0
  const raw =
    promo.discountType === "percent" ? Math.round((subtotalMinor * promo.discountValue) / 100) : promo.discountValue
  return Math.max(0, Math.min(raw, subtotalMinor))
}

interface PromoCodeInputProps {
  eventId: string
  value: AppliedPromo | null
  onChange: (promo: AppliedPromo | null) => void
  formatSaving: (minor: number) => string
  savingMinor: number
  disabled?: boolean
  /** Shown under the field, e.g. when checkout rejected the code at payment time. */
  externalError?: string | null
  /**
   * Start as a small "Have a promo code?" link so most buyers, who have no
   * code, never see an empty field. Opens by itself when a code is applied
   * or checkout reports a problem with one.
   */
  collapsible?: boolean
}

/**
 * The only promo control in checkout. Checking a code calls the read-only,
 * rate-limited preview endpoint: it never creates an order or holds tickets.
 */
export function PromoCodeInput({
  eventId,
  value,
  onChange,
  formatSaving,
  savingMinor,
  disabled,
  externalError,
  collapsible,
}: PromoCodeInputProps) {
  const [open, setOpen] = React.useState(!collapsible)
  const [code, setCode] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputId = React.useId()
  const errorId = `${inputId}-error`
  const shownError = error ?? externalError ?? null

  async function handleApply() {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/orders/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, eventId }),
      })
      const json = await res.json().catch(() => null)
      if (json?.valid) {
        onChange({ code: trimmed, discountType: json.discountType, discountValue: json.discountValue })
        setCode("")
      } else {
        setError(json?.error ?? (res.status === 429 ? "Too many tries. Wait a minute and try again." : "Invalid or expired promo code"))
        onChange(null)
      }
    } catch {
      setError("Could not check the code. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-accent bg-accent-soft px-3 py-2.5">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <Icon name="check" size={12} strokeWidth={3} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-mono text-[13px] font-semibold uppercase tracking-wide">{value.code} applied</span>
          <span className="text-[12px] text-ink-3">
            {savingMinor > 0 ? `You save ${formatSaving(savingMinor)}` : "Discount applied at payment"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setError(null)
          }}
          disabled={disabled}
          className="min-h-[44px] px-1 text-[12px] font-semibold text-accent disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    )
  }

  if (!open && !shownError) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="min-h-[44px] text-[13px] font-semibold text-accent disabled:opacity-40"
      >
        Have a promo code?
      </button>
    )
  }

  return (
    <div>
      <label htmlFor={inputId} className="text-label mb-1.5 block">
        Promo code <span className="font-normal text-ink-3">(optional)</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void handleApply()
            }
          }}
          placeholder="Add a code"
          autoFocus={collapsible}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? errorId : undefined}
          disabled={disabled || loading}
          className="h-11 min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-surface px-3 font-mono text-[13px] uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
        <Button type="button" variant="outline" size="md" onClick={handleApply} disabled={disabled || loading || !code.trim()}>
          {loading ? "Checking…" : "Apply"}
        </Button>
      </div>
      {shownError && (
        <p id={errorId} role="alert" className="mt-1.5 text-[12px] text-danger">
          {shownError}
        </p>
      )}
    </div>
  )
}
