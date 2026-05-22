// Quiet · Payouts & ledger (organizer console)
// Pixel-faithful port of QuietDeskPayouts from hifi-quiet-org-desk.jsx.

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"

export interface PayoutsLedgerProps {
  orgName: string
  currency: string
  availableBalanceMinor: number
  onHoldMinor: number
  lifetimeGrossMinor: number
  primaryAccountLabel: string | null
  payouts: Array<{
    id: string
    dateLabel: string
    amountMinor: number
    destination: string
    status: "paid" | "pending" | "failed" | "processing"
    ref: string
  }>
  ledger: Array<{
    id: string
    type: string
    referenceLabel: string
    amountMinor: number
    runningBalanceMinor: number
  }>
  accounts: Array<{
    id: string
    label: string
    name: string
    sub: string | null
    status: "verified" | "pending" | "failed"
  }>
}

function formatMoney(minor: number, currency: string): string {
  const sign = minor < 0 ? "−" : ""
  const abs = Math.abs(minor) / 100
  const formatted = abs.toLocaleString("en", { maximumFractionDigits: 0 })
  return `${sign}${currency} ${formatted}`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    paid: { bg: "bg-accent-soft", fg: "text-accent" },
    verified: { bg: "bg-accent-soft", fg: "text-accent" },
    pending: { bg: "bg-[#fdf6ed]", fg: "text-[#c1841c]" },
    processing: { bg: "bg-[#fdf6ed]", fg: "text-[#c1841c]" },
    failed: { bg: "bg-[#fdf0ec]", fg: "text-[#c1422b]" },
  }
  const s = map[status] ?? map.pending
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono ${s.bg} ${s.fg}`}
    >
      {status}
    </span>
  )
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex-1 p-4">
      <div className="text-label">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 font-mono text-[10px] text-ink-3">{sub}</div>}
    </Card>
  )
}

export function PayoutsLedger(p: PayoutsLedgerProps) {
  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      {/* Header */}
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">MONEY / PAYOUTS</div>
          <h1 className="text-h1 mt-1">Payouts &amp; ledger</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" size="xs">Statements</Button>
          <Button variant="accent" size="xs">
            <Icon name="arrowUR" size={12} /> Request payout
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex gap-3.5">
        <KPI
          label="Available balance"
          value={formatMoney(p.availableBalanceMinor, p.currency)}
          sub="Withdraw any time"
        />
        <KPI
          label="On hold"
          value={formatMoney(p.onHoldMinor, p.currency)}
          sub="Releases per ticket scan"
        />
        <KPI
          label="Lifetime gross"
          value={formatMoney(p.lifetimeGrossMinor, p.currency)}
        />
        <KPI
          label="Payout account"
          value={p.primaryAccountLabel ?? "Not set"}
          sub={p.primaryAccountLabel ? "Verified · primary" : "Add one to receive funds"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        {/* Recent payouts */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <span className="text-h3">Recent payouts</span>
            <span className="font-mono text-[11px] text-ink-3">
              last 12 mo · {p.payouts.length} payouts
            </span>
          </div>
          {p.payouts.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-xs text-ink-3">
              No payouts yet.
            </div>
          ) : (
            p.payouts.map((row, i) => (
              <div
                key={row.id}
                className={`grid grid-cols-[0.7fr_1fr_1.2fr_0.8fr_0.8fr] items-center gap-2 px-4 py-3 text-xs ${
                  i < p.payouts.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="font-mono text-ink-3">{row.dateLabel}</span>
                <span className="font-mono font-semibold">
                  {formatMoney(row.amountMinor, p.currency)}
                </span>
                <span className="font-mono text-ink-3">{row.destination}</span>
                <StatusBadge status={row.status} />
                <span className="text-right font-mono text-ink-3">{row.ref}</span>
              </div>
            ))
          )}
        </Card>

        {/* Ledger */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
            <div className="flex flex-col">
              <span className="text-h3">Ledger · double-entry</span>
              <span className="font-mono text-[10px] text-ink-3">
                every charge, refund &amp; payout
              </span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-accent">full ledger ›</span>
          </div>
          {p.ledger.length === 0 ? (
            <div className="px-4 py-8 text-center font-mono text-xs text-ink-3">
              No ledger entries yet.
            </div>
          ) : (
            p.ledger.slice(0, 12).map((row, i, arr) => (
              <div
                key={row.id}
                className={`grid grid-cols-[1.2fr_1fr_0.8fr_0.8fr] items-center gap-2 px-4 py-2.5 text-[11px] ${
                  i < arr.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="font-mono text-ink-3">{row.type}</span>
                <span className="font-mono text-[10px] text-ink-3">{row.referenceLabel}</span>
                <span
                  className={`font-mono font-semibold ${
                    row.amountMinor >= 0 ? "text-accent" : "text-ink"
                  }`}
                >
                  {row.amountMinor >= 0 ? "+" : ""}
                  {formatMoney(row.amountMinor, p.currency)}
                </span>
                <span className="text-right font-mono text-ink-3">
                  {formatMoney(row.runningBalanceMinor, p.currency)}
                </span>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* Accounts */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-h2">Payout accounts</span>
          <Button variant="default" size="xs">
            <Icon name="plus" size={12} /> Add account
          </Button>
        </div>
        {p.accounts.length === 0 ? (
          <div className="rounded-md border border-dashed border-line p-6 text-center font-mono text-xs text-ink-3">
            No payout accounts. Add one to receive funds.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {p.accounts.map((a) => (
              <Card key={a.id} className="p-3">
                <div className="text-label mb-1">{a.label}</div>
                <div className="text-sm font-semibold">{a.name}</div>
                {a.sub && <div className="mt-0.5 font-mono text-[10px] text-ink-3">{a.sub}</div>}
                <div
                  className={`mt-2 font-mono text-[10px] font-semibold uppercase ${
                    a.status === "verified" ? "text-accent" : "text-[#c1841c]"
                  }`}
                >
                  ● {a.status}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
