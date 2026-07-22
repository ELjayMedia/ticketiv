"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { POSEventContext, POSTicketType } from "@/lib/data/organizer/pos"

type PayMethod = "cash" | "upi" | "card" | "comp"

type POSShift = {
  id: string
  org_id: string
  cashier_user_id: string
  status: "open" | "closed"
  opening_cash_cents: number
  opened_at: string
  device_id: string | null
  device_session_id: string | null
}

type ShiftSummary = {
  shift_id: string
  status: "open" | "closed"
  opened_at: string
  closed_at: string | null
  opening_cash_cents: number
  expected_cash_cents: number
  closing_cash_cents: number | null
  cash_variance_cents: number | null
  order_count: number
  gross_sales_cents: number
  refunds_cents: number
  cash_refunds_cents: number
  payment_totals: {
    cash_cents: number
    card_cents: number
    upi_cents: number
    comp_cents: number
    other_cents: number
  }
}

export interface BoxOfficeProps {
  ctx: POSEventContext
  /** Deprecated: sales are now completed only through fn_pos_charge_with_shift. */
  onCharge?: never
}

const PAY_METHODS: Array<{ id: PayMethod; icon: "wallet" | "qr" | "zap" | "plus"; label: string }> = [
  { id: "cash", icon: "wallet", label: "Cash" },
  { id: "upi", icon: "qr", label: "MoMo" },
  { id: "card", icon: "zap", label: "Tap card" },
  { id: "comp", icon: "plus", label: "Comp" },
]

function formatMoney(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function parseMoneyInput(value: string): number | null {
  const amount = Number(value.trim().replace(/,/g, ""))
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null
}

export function BoxOffice({ ctx }: BoxOfficeProps) {
  const router = useRouter()
  const [qty, setQty] = React.useState<Record<string, number>>({})
  const [method, setMethod] = React.useState<PayMethod>("cash")
  const [buyerName, setBuyerName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [flash, setFlash] = React.useState<string | null>(null)
  const [shift, setShift] = React.useState<POSShift | null>(null)
  const [summary, setSummary] = React.useState<ShiftSummary | null>(null)
  const [shiftLoading, setShiftLoading] = React.useState(true)
  const [openingFloat, setOpeningFloat] = React.useState("0")
  const [closingCash, setClosingCash] = React.useState("")
  const [showClose, setShowClose] = React.useState(false)
  const supabase = React.useMemo(() => createClientSupabaseClient() as any, [])

  const refreshSummary = React.useCallback(async (shiftId: string) => {
    if (!supabase) return
    const { data, error } = await supabase.rpc("fn_pos_shift_summary", { p_shift_id: shiftId })
    if (error) throw new Error(error.message)
    setSummary(data as ShiftSummary)
  }, [supabase])

  React.useEffect(() => {
    let cancelled = false
    const loadShift = async () => {
      if (!supabase) {
        if (!cancelled) {
          setFlash("POS is unavailable because Supabase is not configured.")
          setShiftLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from("pos_shifts")
        .select("id, org_id, cashier_user_id, status, opening_cash_cents, opened_at, device_id, device_session_id")
        .eq("org_id", ctx.orgId)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setFlash(error.message)
      } else if (data) {
        const activeShift = data as POSShift
        setShift(activeShift)
        try {
          await refreshSummary(activeShift.id)
        } catch (err) {
          setFlash(err instanceof Error ? err.message : "Could not load shift totals")
        }
      }
      setShiftLoading(false)
    }

    void loadShift()
    return () => { cancelled = true }
  }, [ctx.orgId, refreshSummary, supabase])

  const setQ = (id: string, delta: number) => setQty((prev) => ({
    ...prev,
    [id]: Math.max(0, (prev[id] ?? 0) + delta),
  }))

  const lines = ctx.ticketTypes
    .map((type) => ({ type, quantity: qty[type.id] ?? 0 }))
    .filter((line) => line.quantity > 0)
  const subtotalCents = lines.reduce((total, line) => total + line.type.priceCents * line.quantity, 0)
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0)

  const openShift = async () => {
    if (!supabase || busy) return
    const openingCashCents = parseMoneyInput(openingFloat)
    if (openingCashCents === null) return setFlash("Enter a valid opening cash amount.")

    setBusy(true)
    setFlash(null)
    try {
      const { data, error } = await supabase.rpc("fn_open_pos_shift", {
        p_org_id: ctx.orgId,
        p_device_id: null,
        p_device_session_id: null,
        p_opening_cash_cents: openingCashCents,
        p_notes: `Opened from ${ctx.deviceLabel}`,
      })
      if (error) throw new Error(error.message)
      const opened = data as POSShift
      setShift(opened)
      await refreshSummary(opened.id)
      setFlash("Shift opened")
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Could not open shift")
    } finally {
      setBusy(false)
    }
  }

  const charge = async () => {
    if (!supabase || busy || itemCount === 0 || !shift) return
    setBusy(true)
    setFlash(null)
    try {
      const { error } = await supabase.rpc("fn_pos_charge_with_shift", {
        p_shift_id: shift.id,
        p_event_id: ctx.eventId,
        p_items: lines.map((line) => ({
          ticket_type_id: line.type.id,
          quantity: line.quantity,
        })),
        p_payment_method: method,
        p_buyer_name: buyerName || null,
        p_buyer_email: null,
        p_buyer_phone: null,
      })
      if (error) throw new Error(error.message)
      await refreshSummary(shift.id)
      setQty({})
      setBuyerName("")
      setFlash("Charged ✓")
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Charge failed")
    } finally {
      setBusy(false)
    }
  }

  const closeShift = async () => {
    if (!supabase || busy || !shift) return
    const closingCashCents = parseMoneyInput(closingCash)
    if (closingCashCents === null) return setFlash("Enter the counted closing cash amount.")

    setBusy(true)
    setFlash(null)
    try {
      const { data, error } = await supabase.rpc("fn_close_pos_shift", {
        p_shift_id: shift.id,
        p_closing_cash_cents: closingCashCents,
        p_notes: `Closed from ${ctx.deviceLabel}`,
      })
      if (error) throw new Error(error.message)
      setSummary(data as ShiftSummary)
      setShift(null)
      setShowClose(false)
      setClosingCash("")
      setFlash("Shift closed and reconciled")
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Could not close shift")
    } finally {
      setBusy(false)
    }
  }

  if (shiftLoading) {
    return <div className="flex min-h-[70vh] items-center justify-center bg-bg px-5 font-mono text-xs text-ink-3">Loading cashier shift…</div>
  }

  if (!shift) {
    return (
      <div className="min-h-[70vh] bg-bg px-5 pb-10 pt-20">
        <div className="mx-auto max-w-md">
          <button onClick={() => router.back()} className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Back">
            <Icon name="chevL" size={22} />
          </button>
          <Card className="p-5">
            <div className="text-label mb-1">Cashier control</div>
            <h1 className="text-xl font-semibold">Open a shift</h1>
            <p className="mt-2 text-sm text-ink-3">Enter the cash float currently in the drawer. Every sale will be attributed to this shift.</p>
            <label className="mt-5 block text-label">Opening cash ({ctx.currency})</label>
            <input type="number" min="0" step="0.01" value={openingFloat} onChange={(event) => setOpeningFloat(event.target.value)} className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-3 font-mono text-lg outline-none focus:border-accent" />
            {flash && <p className="mt-3 font-mono text-xs text-ink-3">{flash}</p>}
            <Button variant="accent" className="mt-5 w-full py-3.5" disabled={busy} onClick={openShift}>{busy ? "Opening…" : "Open shift"}</Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg pb-32">
      <div className="h-14" />
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-2">
        <button onClick={() => router.back()} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Back"><Icon name="chevL" size={22} /></button>
        <div className="flex flex-1 flex-col">
          <span className="text-label">Box office · shift open</span>
          <span className="text-[15px] font-semibold leading-tight">{ctx.eventTitle} · {ctx.deviceLabel}</span>
        </div>
        <button onClick={() => void refreshSummary(shift.id)} className="inline-flex h-9 items-center justify-center rounded-full border border-line px-3 font-mono text-[10px] hover:bg-line/40">Refresh</button>
      </div>

      {summary && (
        <div className="px-5 pb-4">
          <Card className="grid grid-cols-3 gap-3 p-3.5">
            <Metric label="Sales" value={formatMoney(summary.gross_sales_cents, ctx.currency)} />
            <Metric label="Orders" value={String(summary.order_count)} />
            <Metric label="Cash expected" value={formatMoney(summary.expected_cash_cents, ctx.currency)} />
            <Metric label="Cash" value={formatMoney(summary.payment_totals.cash_cents, ctx.currency)} />
            <Metric label="Card" value={formatMoney(summary.payment_totals.card_cents, ctx.currency)} />
            <Metric label="MoMo" value={formatMoney(summary.payment_totals.upi_cents, ctx.currency)} />
          </Card>
        </div>
      )}

      <div className="px-5 pb-4">
        <div className="text-label mb-2">Tickets</div>
        <div className="flex flex-col gap-1.5">
          {ctx.ticketTypes.map((ticket) => (
            <TicketRow key={ticket.id} t={ticket} q={qty[ticket.id] ?? 0} currency={ctx.currency} onMinus={() => setQ(ticket.id, -1)} onPlus={() => setQ(ticket.id, 1)} />
          ))}
        </div>
      </div>

      <div className="px-5 pb-4">
        <div className="text-label mb-2">Pay with</div>
        <div className="grid grid-cols-4 gap-1.5">
          {PAY_METHODS.map((paymentMethod) => (
            <button key={paymentMethod.id} type="button" onClick={() => setMethod(paymentMethod.id)} className={`flex flex-col items-center gap-1 rounded-md border p-2.5 ${paymentMethod.id === method ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink"}`}>
              <Icon name={paymentMethod.icon} size={18} />
              <span className="text-[11px] font-semibold">{paymentMethod.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 pb-4">
        <Card className="bg-bg p-3.5">
          {lines.length === 0 ? <div className="py-2 text-center font-mono text-xs text-ink-3">Add tickets to start an order.</div> : (
            <>
              {lines.map((line) => (
                <div key={line.type.id} className="flex items-center py-1">
                  <span className="flex-1 font-mono text-xs text-ink-3">{line.quantity} × {line.type.name}</span>
                  <span className="font-mono text-xs">{formatMoney(line.type.priceCents * line.quantity, ctx.currency)}</span>
                </div>
              ))}
              <div className="my-2 h-px bg-line" />
              <div className="flex items-center"><span className="flex-1 text-sm font-semibold">Total</span><span className="font-mono text-lg font-semibold">{formatMoney(subtotalCents, ctx.currency)}</span></div>
            </>
          )}
        </Card>
      </div>

      <div className="px-5 pb-4">
        <div className="text-label mb-2">Buyer (optional)</div>
        <Card className="flex items-center gap-2 p-3">
          <Icon name="user" size={16} className="text-ink-3" />
          <input type="text" placeholder="Name for receipt" value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" />
          <span className="font-mono text-[10px] text-ink-3">skip</span>
        </Card>
      </div>

      {showClose && summary && (
        <div className="px-5 pb-4">
          <Card className="border-accent p-4">
            <div className="text-label">Close shift</div>
            <div className="mt-1 flex items-center justify-between"><span className="text-sm text-ink-3">Expected cash</span><span className="font-mono font-semibold">{formatMoney(summary.expected_cash_cents, ctx.currency)}</span></div>
            <label className="mt-4 block text-label">Counted cash ({ctx.currency})</label>
            <input type="number" min="0" step="0.01" value={closingCash} onChange={(event) => setClosingCash(event.target.value)} className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-3 font-mono text-lg outline-none focus:border-accent" />
            <div className="mt-4 flex gap-2">
              <Button variant="default" className="flex-1" onClick={() => setShowClose(false)}>Cancel</Button>
              <Button variant="accent" className="flex-1" disabled={busy} onClick={closeShift}>{busy ? "Closing…" : "Close & reconcile"}</Button>
            </div>
          </Card>
        </div>
      )}

      {flash && <div className="px-5 pb-2 text-center font-mono text-xs text-ink-3">{flash}</div>}
      <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface px-5 pb-7 pt-3.5">
        <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] text-ink-3">Shift {shift.id.slice(0, 8)}</span><button className="font-mono text-[10px] text-accent" onClick={() => setShowClose((value) => !value)}>{showClose ? "Hide close" : "Close shift"}</button></div>
        <div className="flex items-center gap-2">
          <Button variant="default" className="flex-1 rounded-md py-3.5" onClick={() => window.print()}>Print</Button>
          <Button variant="accent" className="flex-[2] rounded-md py-3.5" disabled={busy || itemCount === 0} onClick={charge}>{busy ? "Charging…" : `Charge ${formatMoney(subtotalCents, ctx.currency)}`}<Icon name="arrowR" size={16} /></Button>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><div className="text-label truncate">{label}</div><div className="mt-1 truncate font-mono text-xs font-semibold">{value}</div></div>
}

function TicketRow({ t, q, currency, onMinus, onPlus }: { t: POSTicketType; q: number; currency: string; onMinus: () => void; onPlus: () => void }) {
  const enabled = !t.isSoldOut && !t.isPaused
  const meta = t.isSoldOut ? "sold out" : t.isPaused ? "paused" : t.posQuotaRemaining === null ? `${currency} ${(t.priceCents / 100).toLocaleString()}` : `${t.posQuotaRemaining} left at door · ${currency} ${(t.priceCents / 100).toLocaleString()}`
  return (
    <Card className={`flex items-center gap-2.5 p-3 ${q > 0 ? "border-accent bg-accent-soft" : ""}`} style={{ opacity: enabled ? 1 : 0.5 }}>
      <div className="flex flex-1 flex-col"><span className="text-sm font-semibold">{t.name}</span><span className="font-mono text-[11px] text-ink-3">{meta}</span></div>
      <button type="button" disabled={!enabled || q === 0} onClick={onMinus} className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-line-2 bg-surface disabled:opacity-40"><Icon name="minus" size={14} /></button>
      <span className="min-w-[22px] text-center font-mono text-base font-semibold">{q}</span>
      <button type="button" disabled={!enabled} onClick={onPlus} className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border ${q > 0 ? "border-accent bg-accent text-white" : "border-line-2 bg-surface text-ink"} disabled:opacity-40`}><Icon name="plus" size={14} /></button>
    </Card>
  )
}
