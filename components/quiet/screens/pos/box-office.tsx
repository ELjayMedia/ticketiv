"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import type { POSEventContext, POSTicketType } from "@/lib/data/organizer/pos"
import posthog from "posthog-js"

type PayMethod = "cash" | "upi" | "card" | "comp"
type POSShift = { id: string; org_id: string; cashier_user_id: string; status: "open" | "closed"; opening_cash_cents: number; opened_at: string; device_id: string | null; device_session_id: string | null }
type ShiftSummary = { shift_id: string; status: "open" | "closed"; opened_at: string; closed_at: string | null; opening_cash_cents: number; expected_cash_cents: number; closing_cash_cents: number | null; cash_variance_cents: number | null; order_count: number; gross_sales_cents: number; refunds_cents: number; cash_refunds_cents: number; payment_totals: { cash_cents: number; card_cents: number; upi_cents: number; comp_cents: number; other_cents: number } }
type ShiftTransaction = { order_id: string; receipt_reference: string; created_at: string; total_cents: number; currency: string; item_count: number; buyer_name: string | null; payment_method: string }
type ReceiptLine = { ticket_type_id: string; ticket_name: string; quantity: number; unit_price_cents: number; line_total_cents: number; ticket_codes: string[] }
type POSReceipt = { receipt_reference: string; order_id: string; order_created_at: string; shift_id: string; event: { title: string; starts_at: string | null; timezone: string | null; city: string | null }; buyer: { name: string | null; email: string | null; phone: string | null }; payment: { method: string; amount_cents: number; currency: string; paid_at: string }; items: ReceiptLine[]; item_count: number; subtotal_cents: number; platform_fee_cents: number; processor_fee_cents: number; total_cents: number; currency: string }

export interface BoxOfficeProps { ctx: POSEventContext; onCharge?: never }

const PAY_METHODS: Array<{ id: PayMethod; icon: "wallet" | "qr" | "zap" | "plus"; label: string }> = [
  { id: "cash", icon: "wallet", label: "Cash" },
  { id: "upi", icon: "qr", label: "MoMo" },
  { id: "card", icon: "zap", label: "Tap card" },
  { id: "comp", icon: "plus", label: "Comp" },
]

function formatMoney(cents: number, currency: string) { return `${currency} ${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function parseMoneyInput(value: string) { const amount = Number(value.trim().replace(/,/g, "")); return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null }

export function BoxOffice({ ctx }: BoxOfficeProps) {
  const router = useRouter()
  const supabase = React.useMemo(() => createClientSupabaseClient() as any, [])
  const [qty, setQty] = React.useState<Record<string, number>>({})
  const [method, setMethod] = React.useState<PayMethod>("cash")
  const [buyerName, setBuyerName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [flash, setFlash] = React.useState<string | null>(null)
  const [shift, setShift] = React.useState<POSShift | null>(null)
  const [summary, setSummary] = React.useState<ShiftSummary | null>(null)
  const [transactions, setTransactions] = React.useState<ShiftTransaction[]>([])
  const [receipt, setReceipt] = React.useState<POSReceipt | null>(null)
  const [shiftLoading, setShiftLoading] = React.useState(true)
  const [openingFloat, setOpeningFloat] = React.useState("0")
  const [closingCash, setClosingCash] = React.useState("")
  const [showClose, setShowClose] = React.useState(false)

  const refreshShift = React.useCallback(async (shiftId: string) => {
    if (!supabase) return
    const [summaryRes, txRes] = await Promise.all([
      supabase.rpc("fn_pos_shift_summary", { p_shift_id: shiftId }),
      supabase.rpc("fn_pos_shift_transactions", { p_shift_id: shiftId, p_limit: 20 }),
    ])
    if (summaryRes.error) throw new Error(summaryRes.error.message)
    if (txRes.error) throw new Error(txRes.error.message)
    setSummary(summaryRes.data as ShiftSummary)
    setTransactions((txRes.data ?? []) as ShiftTransaction[])
  }, [supabase])

  const loadReceipt = React.useCallback(async (orderId: string) => {
    if (!supabase) return
    const { data, error } = await supabase.rpc("fn_pos_receipt", { p_order_id: orderId })
    if (error) throw new Error(error.message)
    setReceipt(data as POSReceipt)
  }, [supabase])

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!supabase) { setFlash("POS is unavailable because Supabase is not configured."); setShiftLoading(false); return }
      const { data, error } = await supabase.from("pos_shifts").select("id, org_id, cashier_user_id, status, opening_cash_cents, opened_at, device_id, device_session_id").eq("org_id", ctx.orgId).eq("status", "open").order("opened_at", { ascending: false }).limit(1).maybeSingle()
      if (cancelled) return
      if (error) setFlash(error.message)
      else if (data) { setShift(data as POSShift); try { await refreshShift(data.id) } catch (err) { setFlash(err instanceof Error ? err.message : "Could not load shift") } }
      setShiftLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [ctx.orgId, refreshShift, supabase])

  const lines = ctx.ticketTypes.map((type) => ({ type, quantity: qty[type.id] ?? 0 })).filter((line) => line.quantity > 0)
  const subtotalCents = lines.reduce((total, line) => total + line.type.priceCents * line.quantity, 0)
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0)
  const setQ = (id: string, delta: number) => setQty((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }))

  const openShift = async () => {
    if (!supabase || busy) return
    const openingCashCents = parseMoneyInput(openingFloat)
    if (openingCashCents === null) return setFlash("Enter a valid opening cash amount.")
    setBusy(true); setFlash(null)
    try {
      const { data, error } = await supabase.rpc("fn_open_pos_shift", { p_org_id: ctx.orgId, p_device_id: null, p_device_session_id: null, p_opening_cash_cents: openingCashCents, p_notes: `Opened from ${ctx.deviceLabel}` })
      if (error) throw new Error(error.message)
      setShift(data as POSShift); await refreshShift(data.id); posthog.capture("pos_shift_opened", { organization_id: ctx.orgId, event_id: ctx.eventId }); setFlash("Shift opened")
    } catch (err) { setFlash(err instanceof Error ? err.message : "Could not open shift") } finally { setBusy(false) }
  }

  const charge = async () => {
    if (!supabase || busy || itemCount === 0 || !shift) return
    setBusy(true); setFlash(null)
    try {
      const { data, error } = await supabase.rpc("fn_pos_charge_with_shift", { p_shift_id: shift.id, p_event_id: ctx.eventId, p_items: lines.map((line) => ({ ticket_type_id: line.type.id, quantity: line.quantity })), p_payment_method: method, p_buyer_name: buyerName || null, p_buyer_email: null, p_buyer_phone: null })
      if (error) throw new Error(error.message)
      const orderId = data?.order_id as string | undefined
      await refreshShift(shift.id)
      if (orderId) await loadReceipt(orderId)
      posthog.capture("pos_charge_completed", { organization_id: ctx.orgId, event_id: ctx.eventId, item_count: itemCount, payment_method: method, total_minor: subtotalCents })
      setQty({}); setBuyerName(""); setFlash("Charged and receipt ready ✓")
    } catch (err) { setFlash(err instanceof Error ? err.message : "Charge failed") } finally { setBusy(false) }
  }

  const closeShift = async () => {
    if (!supabase || busy || !shift) return
    const counted = parseMoneyInput(closingCash)
    if (counted === null) return setFlash("Enter the counted closing cash amount.")
    setBusy(true); setFlash(null)
    try {
      const { data, error } = await supabase.rpc("fn_close_pos_shift", { p_shift_id: shift.id, p_closing_cash_cents: counted, p_notes: `Closed from ${ctx.deviceLabel}` })
      if (error) throw new Error(error.message)
      setSummary(data as ShiftSummary); setShift(null); setShowClose(false); setClosingCash(""); setTransactions([]); posthog.capture("pos_shift_closed", { organization_id: ctx.orgId, event_id: ctx.eventId, order_count: data.order_count }); setFlash("Shift closed and reconciled")
    } catch (err) { setFlash(err instanceof Error ? err.message : "Could not close shift") } finally { setBusy(false) }
  }

  if (shiftLoading) return <div className="flex min-h-[70vh] items-center justify-center bg-bg px-5 font-mono text-xs text-ink-3">Loading cashier shift…</div>
  if (!shift) return <div className="min-h-[70vh] bg-bg px-5 pb-10 pt-20"><div className="mx-auto max-w-md"><button onClick={() => router.back()} className="mb-5 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Back"><Icon name="chevL" size={22} /></button><Card className="p-5"><div className="text-label mb-1">Cashier control</div><h1 className="text-xl font-semibold">Open a shift</h1><p className="mt-2 text-sm text-ink-3">Enter the cash float currently in the drawer. Every sale will be attributed to this shift.</p><label className="mt-5 block text-label">Opening cash ({ctx.currency})</label><input type="number" min="0" step="0.01" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-3 font-mono text-lg outline-none focus:border-accent" />{flash && <p className="mt-3 font-mono text-xs text-ink-3">{flash}</p>}<Button variant="accent" className="mt-5 w-full py-3.5" disabled={busy} onClick={openShift}>{busy ? "Opening…" : "Open shift"}</Button></Card></div></div>

  return <div className="bg-bg pb-32">
    <style jsx global>{`@media print { body * { visibility: hidden !important; } #pos-receipt, #pos-receipt * { visibility: visible !important; } #pos-receipt { position: absolute; inset: 0 auto auto 0; width: 80mm; padding: 4mm; background: white; color: black; } .no-print { display: none !important; } }`}</style>
    <div className="h-14" />
    <div className="flex items-center gap-2.5 px-5 pb-3 pt-2 no-print"><button onClick={() => router.back()} className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60" aria-label="Back"><Icon name="chevL" size={22} /></button><div className="flex flex-1 flex-col"><span className="text-label">Box office · shift open</span><span className="text-[15px] font-semibold leading-tight">{ctx.eventTitle} · {ctx.deviceLabel}</span></div><button onClick={() => void refreshShift(shift.id)} className="inline-flex h-9 items-center justify-center rounded-full border border-line px-3 font-mono text-[10px] hover:bg-line/40">Refresh</button></div>

    {summary && <div className="px-5 pb-4 no-print"><Card className="grid grid-cols-3 gap-3 p-3.5"><Metric label="Sales" value={formatMoney(summary.gross_sales_cents, ctx.currency)} /><Metric label="Orders" value={String(summary.order_count)} /><Metric label="Cash expected" value={formatMoney(summary.expected_cash_cents, ctx.currency)} /><Metric label="Cash" value={formatMoney(summary.payment_totals.cash_cents, ctx.currency)} /><Metric label="Card" value={formatMoney(summary.payment_totals.card_cents, ctx.currency)} /><Metric label="MoMo" value={formatMoney(summary.payment_totals.upi_cents, ctx.currency)} /></Card></div>}

    {receipt && <div className="px-5 pb-4"><ReceiptCard receipt={receipt} onClose={() => setReceipt(null)} /></div>}

    <div className="px-5 pb-4 no-print"><div className="text-label mb-2">Recent transactions</div><Card className="divide-y divide-line overflow-hidden">{transactions.length === 0 ? <div className="p-4 text-center font-mono text-xs text-ink-3">No completed sales in this shift.</div> : transactions.map((tx) => <button key={tx.order_id} type="button" onClick={() => void loadReceipt(tx.order_id)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-line/30"><div className="flex-1 min-w-0"><div className="truncate text-sm font-semibold">{tx.receipt_reference} · {tx.buyer_name || "Walk-in"}</div><div className="font-mono text-[10px] text-ink-3">{new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {tx.item_count} ticket{tx.item_count === 1 ? "" : "s"} · {tx.payment_method}</div></div><span className="font-mono text-xs font-semibold">{formatMoney(tx.total_cents, tx.currency)}</span></button>)}</Card></div>

    <div className="px-5 pb-4 no-print"><div className="text-label mb-2">Tickets</div><div className="flex flex-col gap-1.5">{ctx.ticketTypes.map((ticket) => <TicketRow key={ticket.id} t={ticket} q={qty[ticket.id] ?? 0} currency={ctx.currency} onMinus={() => setQ(ticket.id, -1)} onPlus={() => setQ(ticket.id, 1)} />)}</div></div>
    <div className="px-5 pb-4 no-print"><div className="text-label mb-2">Pay with</div><div className="grid grid-cols-4 gap-1.5">{PAY_METHODS.map((p) => <button key={p.id} type="button" onClick={() => setMethod(p.id)} className={`flex flex-col items-center gap-1 rounded-md border p-2.5 ${p.id === method ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface text-ink"}`}><Icon name={p.icon} size={18} /><span className="text-[11px] font-semibold">{p.label}</span></button>)}</div></div>
    <div className="px-5 pb-4 no-print"><Card className="bg-bg p-3.5">{lines.length === 0 ? <div className="py-2 text-center font-mono text-xs text-ink-3">Add tickets to start an order.</div> : <>{lines.map((line) => <div key={line.type.id} className="flex items-center py-1"><span className="flex-1 font-mono text-xs text-ink-3">{line.quantity} × {line.type.name}</span><span className="font-mono text-xs">{formatMoney(line.type.priceCents * line.quantity, ctx.currency)}</span></div>)}<div className="my-2 h-px bg-line" /><div className="flex items-center"><span className="flex-1 text-sm font-semibold">Total</span><span className="font-mono text-lg font-semibold">{formatMoney(subtotalCents, ctx.currency)}</span></div></>}</Card></div>
    <div className="px-5 pb-4 no-print"><div className="text-label mb-2">Buyer (optional)</div><Card className="flex items-center gap-2 p-3"><Icon name="user" size={16} className="text-ink-3" /><input type="text" placeholder="Name for receipt" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3" /><span className="font-mono text-[10px] text-ink-3">skip</span></Card></div>

    {showClose && summary && <div className="px-5 pb-4 no-print"><Card className="border-accent p-4"><div className="text-label">Close shift</div><div className="mt-1 flex items-center justify-between"><span className="text-sm text-ink-3">Expected cash</span><span className="font-mono font-semibold">{formatMoney(summary.expected_cash_cents, ctx.currency)}</span></div><label className="mt-4 block text-label">Counted cash ({ctx.currency})</label><input type="number" min="0" step="0.01" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} className="mt-2 w-full rounded-md border border-line bg-surface px-3 py-3 font-mono text-lg outline-none focus:border-accent" /><div className="mt-4 flex gap-2"><Button variant="default" className="flex-1" onClick={() => setShowClose(false)}>Cancel</Button><Button variant="accent" className="flex-1" disabled={busy} onClick={closeShift}>{busy ? "Closing…" : "Close & reconcile"}</Button></div></Card></div>}
    {flash && <div className="px-5 pb-2 text-center font-mono text-xs text-ink-3 no-print">{flash}</div>}
    <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface px-5 pb-7 pt-3.5 no-print"><div className="mb-2 flex items-center justify-between"><span className="font-mono text-[10px] text-ink-3">Shift {shift.id.slice(0, 8)}</span><button className="font-mono text-[10px] text-accent" onClick={() => setShowClose((v) => !v)}>{showClose ? "Hide close" : "Close shift"}</button></div><div className="flex items-center gap-2"><Button variant="default" className="flex-1 rounded-md py-3.5" disabled={!receipt} onClick={() => window.print()}>{receipt ? "Print receipt" : "No receipt"}</Button><Button variant="accent" className="flex-[2] rounded-md py-3.5" disabled={busy || itemCount === 0} onClick={charge}>{busy ? "Charging…" : `Charge ${formatMoney(subtotalCents, ctx.currency)}`}<Icon name="arrowR" size={16} /></Button></div></div>
  </div>
}

function ReceiptCard({ receipt, onClose }: { receipt: POSReceipt; onClose: () => void }) {
  return <Card id="pos-receipt" className="border-accent p-4 font-mono text-xs"><div className="flex items-start justify-between no-print"><div className="text-label">Receipt ready</div><button type="button" onClick={onClose} className="text-ink-3">Close</button></div><div className="mt-2 text-center"><div className="text-lg font-bold">TICKETIV</div><div>{receipt.event.title}</div><div className="text-ink-3">{receipt.receipt_reference}</div></div><div className="my-3 border-t border-dashed border-line" />{receipt.items.map((item) => <div key={item.ticket_type_id} className="mb-2"><div className="flex justify-between gap-3"><span>{item.quantity} × {item.ticket_name}</span><span>{formatMoney(item.line_total_cents, receipt.currency)}</span></div><div className="text-[9px] text-ink-3">{item.ticket_codes.join(" · ")}</div></div>)}<div className="border-t border-dashed border-line pt-2"><div className="flex justify-between font-bold"><span>Total</span><span>{formatMoney(receipt.total_cents, receipt.currency)}</span></div><div className="mt-1 flex justify-between"><span>Paid by</span><span>{receipt.payment.method}</span></div><div className="flex justify-between"><span>Buyer</span><span>{receipt.buyer.name || "Walk-in"}</span></div><div className="flex justify-between"><span>Time</span><span>{new Date(receipt.order_created_at).toLocaleString()}</span></div></div><div className="mt-3 text-center text-[9px] text-ink-3">Keep this receipt and ticket code(s) for entry support.</div><Button variant="accent" className="mt-4 w-full no-print" onClick={() => window.print()}>Print receipt</Button></Card>
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><div className="text-label truncate">{label}</div><div className="mt-1 truncate font-mono text-xs font-semibold">{value}</div></div> }
function TicketRow({ t, q, currency, onMinus, onPlus }: { t: POSTicketType; q: number; currency: string; onMinus: () => void; onPlus: () => void }) { const enabled = !t.isSoldOut && !t.isPaused; const meta = t.isSoldOut ? "sold out" : t.isPaused ? "paused" : t.posQuotaRemaining === null ? `${currency} ${(t.priceCents / 100).toLocaleString()}` : `${t.posQuotaRemaining} left at door · ${currency} ${(t.priceCents / 100).toLocaleString()}`; return <Card className={`flex items-center gap-2.5 p-3 ${q > 0 ? "border-accent bg-accent-soft" : ""}`} style={{ opacity: enabled ? 1 : 0.5 }}><div className="flex flex-1 flex-col"><span className="text-sm font-semibold">{t.name}</span><span className="font-mono text-[11px] text-ink-3">{meta}</span></div><button type="button" disabled={!enabled || q === 0} onClick={onMinus} className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border border-line-2 bg-surface disabled:opacity-40"><Icon name="minus" size={14} /></button><span className="min-w-[22px] text-center font-mono text-base font-semibold">{q}</span><button type="button" disabled={!enabled} onClick={onPlus} className={`inline-flex h-[30px] w-[30px] items-center justify-center rounded-md border ${q > 0 ? "border-accent bg-accent text-white" : "border-line-2 bg-surface text-ink"} disabled:opacity-40`}><Icon name="plus" size={14} /></button></Card> }
