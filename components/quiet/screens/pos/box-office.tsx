"use client"

// Quiet · Box-office POS terminal
// Pixel-faithful port of QuietPOS. Compose existing RPCs/route handlers
// for charge: fn_quote_order → fn_create_inventory_protected_order →
// POST /api/payments/complete with channel="pos".

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
// Type-only import: server-only data module is never loaded into client bundle.
import type { POSEventContext, POSTicketType } from "@/lib/data/organizer/pos"

type PayMethod = "cash" | "upi" | "card" | "comp"

export interface BoxOfficeProps {
  ctx: POSEventContext
  onCharge?: (payload: {
    items: Array<{ ticketTypeId: string; quantity: number }>
    method: PayMethod
    buyer: { name: string | null; phone: string | null }
  }) => Promise<void>
}

const PAY_METHODS: Array<{ id: PayMethod; icon: "wallet" | "qr" | "zap" | "plus"; label: string }> = [
  { id: "cash", icon: "wallet", label: "Cash" },
  { id: "upi", icon: "qr", label: "MoMo" },
  { id: "card", icon: "zap", label: "Tap card" },
  { id: "comp", icon: "plus", label: "Comp" },
]

function formatMoney(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toLocaleString()}`
}

export function BoxOffice({ ctx, onCharge }: BoxOfficeProps) {
  const router = useRouter()
  const [qty, setQty] = React.useState<Record<string, number>>({})
  const [method, setMethod] = React.useState<PayMethod>("cash")
  const [buyerName, setBuyerName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [flash, setFlash] = React.useState<string | null>(null)

  const setQ = (id: string, delta: number) =>
    setQty((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta)
      return { ...prev, [id]: next }
    })

  const lines = ctx.ticketTypes
    .map((t) => ({ type: t, quantity: qty[t.id] ?? 0 }))
    .filter((l) => l.quantity > 0)

  const subtotalCents = lines.reduce((acc, l) => acc + l.type.priceCents * l.quantity, 0)
  const itemCount = lines.reduce((acc, l) => acc + l.quantity, 0)

  const charge = async () => {
    if (busy || itemCount === 0) return
    setBusy(true)
    setFlash(null)
    try {
      await onCharge?.({
        items: lines.map((l) => ({ ticketTypeId: l.type.id, quantity: l.quantity })),
        method,
        buyer: { name: buyerName || null, phone: null },
      })
      setQty({})
      setBuyerName("")
      setFlash("Charged ✓")
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Charge failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-bg pb-28">
      <div className="h-14" />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pb-3.5 pt-2">
        <button
          onClick={() => router.back()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Back"
        >
          <Icon name="chevL" size={22} />
        </button>
        <div className="flex flex-1 flex-col">
          <span className="text-label">Box office</span>
          <span className="text-[15px] font-semibold leading-tight">
            {ctx.eventTitle} · {ctx.deviceLabel}
          </span>
        </div>
        <button
          onClick={() => router.push("/profile")}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
          aria-label="Profile"
        >
          <Icon name="user" size={20} />
        </button>
      </div>

      {/* Ticket selection */}
      <div className="px-5 pb-4">
        <div className="text-label mb-2">Tickets</div>
        <div className="flex flex-col gap-1.5">
          {ctx.ticketTypes.map((tk) => (
            <TicketRow
              key={tk.id}
              t={tk}
              q={qty[tk.id] ?? 0}
              currency={ctx.currency}
              onMinus={() => setQ(tk.id, -1)}
              onPlus={() => setQ(tk.id, +1)}
            />
          ))}
        </div>
      </div>

      {/* Pay method */}
      <div className="px-5 pb-4">
        <div className="text-label mb-2">Pay with</div>
        <div className="grid grid-cols-4 gap-1.5">
          {PAY_METHODS.map((p) => {
            const on = p.id === method
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setMethod(p.id)}
                className={`flex flex-col items-center gap-1 rounded-md border p-2.5 ${
                  on
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-ink"
                }`}
              >
                <Icon name={p.icon} size={18} />
                <span className="text-[11px] font-semibold">{p.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 pb-4">
        <Card className="bg-bg p-3.5">
          {lines.length === 0 ? (
            <div className="py-2 text-center font-mono text-xs text-ink-3">
              Add tickets to start an order.
            </div>
          ) : (
            <>
              {lines.map((l) => (
                <div key={l.type.id} className="flex items-center py-1">
                  <span className="flex-1 font-mono text-xs text-ink-3">
                    {l.quantity} × {l.type.name}
                  </span>
                  <span className="font-mono text-xs">
                    {formatMoney(l.type.priceCents * l.quantity, ctx.currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-center py-1">
                <span className="flex-1 font-mono text-xs text-ink-3">Booking fee</span>
                <span className="font-mono text-xs text-accent">waived (POS)</span>
              </div>
              <div className="my-2 h-px bg-line" />
              <div className="flex items-center">
                <span className="flex-1 text-sm font-semibold">Total</span>
                <span className="font-mono text-lg font-semibold">
                  {formatMoney(subtotalCents, ctx.currency)}
                </span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Buyer */}
      <div className="px-5 pb-4">
        <div className="text-label mb-2">Buyer (optional)</div>
        <Card className="flex items-center gap-2 p-3">
          <Icon name="user" size={16} className="text-ink-3" />
          <input
            type="text"
            placeholder="Name or phone for receipt"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
          />
          <span className="font-mono text-[10px] text-ink-3">skip</span>
        </Card>
      </div>

      {flash && (
        <div className="px-5 pb-2 text-center font-mono text-xs text-ink-3">{flash}</div>
      )}

      {/* Charge */}
      <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface px-5 pb-7 pt-3.5">
        <div className="flex items-center gap-2">
          <Button variant="default" className="flex-1 rounded-md py-3.5" onClick={() => window.print()}>
            Print receipt
          </Button>
          <Button
            variant="accent"
            className="flex-[2] rounded-md py-3.5"
            disabled={busy || itemCount === 0}
            onClick={charge}
          >
            {busy ? "Charging…" : `Charge ${formatMoney(subtotalCents, ctx.currency)}`}
            <Icon name="arrowR" size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function TicketRow({
  t,
  q,
  currency,
  onMinus,
  onPlus,
}: {
  t: POSTicketType
  q: number
  currency: string
  onMinus: () => void
  onPlus: () => void
}) {
  const enabled = !t.isSoldOut && !t.isPaused
  const meta = t.isSoldOut
    ? "sold out"
    : t.isPaused
      ? "paused"
      : t.posQuotaRemaining === null
        ? `${currency} ${(t.priceCents / 100).toLocaleString()}`
        : `${t.posQuotaRemaining} left at door · ${currency} ${(t.priceCents / 100).toLocaleString()}`

  return (
    <Card
      className={`flex items-center gap-2.5 p-3 ${q > 0 ? "border-accent bg-accent-soft" : ""}`}
      style={{ opacity: enabled ? 1 : 0.5 }}
    >
      <div className="flex flex-1 flex-col">
        <span className="text-sm font-semibold">{t.name}</span>
        <span className="font-mono text-[11px] text-ink-3">{meta}</span>
      </div>
      <button
        type="button"
        disabled={!enabled || q === 0}
        onClick={onMinus}
        className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-line-2 bg-surface disabled:opacity-40"
      >
        <Icon name="minus" size={14} />
      </button>
      <span className="min-w-[22px] text-center font-mono text-base font-semibold">{q}</span>
      <button
        type="button"
        disabled={!enabled}
        onClick={onPlus}
        className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border ${
          q > 0
            ? "border-accent bg-accent text-white"
            : "border-line-2 bg-surface text-ink"
        } disabled:opacity-40`}
      >
        <Icon name="plus" size={14} />
      </button>
    </Card>
  )
}
