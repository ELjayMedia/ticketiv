"use client"

// Quiet · Payouts & ledger (organizer console)
// Pixel-faithful port of QuietDeskPayouts from hifi-quiet-org-desk.jsx.

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { RequestPayoutButton } from "@/components/quiet/screens/payouts/request-payout-button"

export interface PayoutsLedgerProps {
  orgId: string
  orgName: string
  currency: string
  availableBalanceMinor: number
  onHoldMinor: number
  lifetimeGrossMinor: number
  finance: {
    grossMinor: number
    feesMinor: number
    netMinor: number
    refundsMinor: number
    paidOutMinor: number
    pendingPayoutMinor: number
    availableMinor: number
    capturedAvailableMinor: number
    settledNetMinor: number
    pendingSettlementMinor: number
    settlementHoldDays: number
  }
  primaryAccountLabel: string | null
  paymentReadiness: {
    status: "ready" | "needs_setup"
    currency: string
    hasRouting: boolean
    hasProvider: boolean
    hasPayoutAccount: boolean
    primaryProvider: string | null
    fallbackProvider: string | null
    activeRoutes: Array<{
      id: string
      priority: number
      countryCode: string
      currency: string
      provider: string
      fallbackProvider: string | null
      active: boolean
    }>
    providers: Array<{
      provider: string
      mode: string
      callbackConfigured: boolean
      updatedAt: string | null
    }>
    recentFailedAttempts: Array<{
      id: string
      provider: string
      status: string
      createdAt: string | null
      orderRef: string
    }>
  }
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

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    paid: { bg: "bg-accent-soft", fg: "text-accent" },
    verified: { bg: "bg-accent-soft", fg: "text-accent" },
    ready: { bg: "bg-accent-soft", fg: "text-accent" },
    pending: { bg: "bg-[#fdf6ed]", fg: "text-[#c1841c]" },
    processing: { bg: "bg-[#fdf6ed]", fg: "text-[#c1841c]" },
    needs_setup: { bg: "bg-[#fdf6ed]", fg: "text-[#c1841c]" },
    failed: { bg: "bg-[#fdf0ec]", fg: "text-[#c1422b]" },
  }
  const s = map[status] ?? map.pending
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono ${s.bg} ${s.fg}`}
    >
      {status.replaceAll("_", " ")}
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
  const router = useRouter()
  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      {/* Header */}
      <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">MONEY / PAYOUTS</div>
          <h1 className="text-h1 mt-1">Payouts &amp; ledger</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" size="xs" onClick={() => router.push(`/orgs/${p.orgId}/finance/statements`)}>Statements</Button>
          <RequestPayoutButton
            orgId={p.orgId}
            availableMinor={p.finance.availableMinor}
            pendingSettlementMinor={p.finance.pendingSettlementMinor}
            settlementHoldDays={p.finance.settlementHoldDays}
            currency={p.currency}
            eligible={p.finance.availableMinor > 0 && Boolean(p.primaryAccountLabel) && p.finance.pendingPayoutMinor === 0}
            blockedReason={
              !p.primaryAccountLabel
                ? "Add a payout account first"
                : p.finance.pendingPayoutMinor > 0
                  ? "A payout is already in progress"
                  : p.finance.availableMinor <= 0 && p.finance.pendingSettlementMinor > 0
                    ? "Funds are still settling"
                  : p.finance.availableMinor <= 0
                    ? "No settled balance to withdraw"
                    : null
            }
          />
        </div>
      </div>

      {/* Finance breakdown */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <KPI label="Gross sales" value={formatMoney(p.finance.grossMinor, p.currency)} sub="Ticket face value" />
        <KPI label="Fees" value={formatMoney(p.finance.feesMinor, p.currency)} sub="Platform + processor" />
        <KPI label="Refunds" value={formatMoney(p.finance.refundsMinor, p.currency)} sub="Returned to buyers" />
        <KPI label="Net earned" value={formatMoney(p.finance.netMinor, p.currency)} sub="After fees" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
        <KPI
          label="Payable balance"
          value={formatMoney(p.availableBalanceMinor, p.currency)}
          sub="Settled and requestable"
        />
        <KPI
          label="Pending settlement"
          value={formatMoney(p.finance.pendingSettlementMinor, p.currency)}
          sub={`${p.finance.settlementHoldDays}-day provider buffer`}
        />
        <KPI
          label="Pending payout"
          value={formatMoney(p.finance.pendingPayoutMinor, p.currency)}
          sub="Requested or processing"
        />
        <KPI
          label="Paid out"
          value={formatMoney(p.finance.paidOutMinor, p.currency)}
          sub="Lifetime settled"
        />
        <KPI
          label="Payout account"
          value={p.primaryAccountLabel ?? "Not set"}
          sub={p.primaryAccountLabel ? "Verified · primary" : "Add one to receive funds"}
        />
      </div>

      <PaymentReadinessCard readiness={p.paymentReadiness} />

      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
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
            <button
              onClick={() => router.push(`/orgs/${p.orgId}/finance/ledger`)}
              className="font-mono text-[11px] font-semibold text-accent hover:opacity-75"
            >
              full ledger ›
            </button>
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
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-h2">Payout accounts</span>
          <Button variant="default" size="xs" onClick={() => router.push(`/orgs/${p.orgId}/payouts/accounts`)}>
            <Icon name="plus" size={12} /> Add account
          </Button>
        </div>
        {p.accounts.length === 0 ? (
          <div className="rounded-md border border-dashed border-line p-6 text-center font-mono text-xs text-ink-3">
            No payout accounts. Add one to receive funds.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

function PaymentReadinessCard({ readiness }: { readiness: PayoutsLedgerProps["paymentReadiness"] }) {
  const checks = [
    { label: "Payment provider", ready: readiness.hasProvider, value: readiness.primaryProvider ?? "Not configured" },
    { label: "Routing rule", ready: readiness.hasRouting, value: readiness.currency },
    { label: "Payout account", ready: readiness.hasPayoutAccount, value: readiness.hasPayoutAccount ? "Added" : "Missing" },
  ]

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-h2">Payment setup</span>
            <StatusBadge status={readiness.status} />
          </div>
          <p className="mt-1 max-w-[620px] font-mono text-[11px] leading-relaxed text-ink-3">
            This shows whether this organisation can safely accept payments and receive payouts. Only non-secret provider status is shown here.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:w-auto lg:min-w-[360px]">
          {checks.map((check) => (
            <div key={check.label} className="rounded-[var(--radius)] border border-line p-3">
              <div className="text-label">{check.label}</div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px]">
                <span className={check.ready ? "text-accent" : "text-[#c1841c]"}>●</span>
                <span className="truncate">{check.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-[var(--radius)] border border-line p-3">
          <div className="text-label mb-2">Active routes</div>
          {readiness.activeRoutes.length === 0 ? (
            <p className="font-mono text-[11px] text-ink-3">No active routing rule for {readiness.currency}.</p>
          ) : (
            <div className="space-y-2">
              {readiness.activeRoutes.slice(0, 3).map((route) => (
                <div key={route.id} className="font-mono text-[11px] text-ink-3">
                  <span className="font-semibold text-ink">{route.countryCode}/{route.currency}</span>{" "}
                  → {route.provider}
                  {route.fallbackProvider ? ` · fallback ${route.fallbackProvider}` : ""}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius)] border border-line p-3">
          <div className="text-label mb-2">Enabled providers</div>
          {readiness.providers.length === 0 ? (
            <p className="font-mono text-[11px] text-ink-3">No enabled providers found.</p>
          ) : (
            <div className="space-y-2">
              {readiness.providers.slice(0, 3).map((provider) => (
                <div key={provider.provider} className="font-mono text-[11px] text-ink-3">
                  <span className="font-semibold text-ink">{provider.provider}</span>{" "}
                  · {provider.mode} · callback {provider.callbackConfigured ? "set" : "missing"}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius)] border border-line p-3">
          <div className="text-label mb-2">Recent failures</div>
          {readiness.recentFailedAttempts.length === 0 ? (
            <p className="font-mono text-[11px] text-ink-3">No recent failed attempts.</p>
          ) : (
            <div className="space-y-2">
              {readiness.recentFailedAttempts.slice(0, 3).map((attempt) => (
                <div key={attempt.id} className="font-mono text-[11px] text-ink-3">
                  <span className="font-semibold text-ink">{attempt.provider}</span>{" "}
                  · {attempt.status} · {attempt.orderRef} · {formatDate(attempt.createdAt)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
