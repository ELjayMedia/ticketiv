import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { getPostEventReconciliationOverview } from "@/lib/data/admin/reconciliation"
import { buildSettlementSummary, type SettlementSummary } from "@/lib/settlement"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import {
  cancelPayoutAction,
  markPayoutFailedAction,
  markPayoutPaidAction,
  markPayoutProcessingAction,
} from "../finance-actions"

export const dynamic = "force-dynamic"
export const metadata = { title: "Payouts · Super admin" }

type PayoutStatus = "requested" | "processing" | "paid" | "failed" | "cancelled"

interface PayoutRow {
  id: string
  org_id: string
  amount_cents: number
  currency: string
  provider: string
  destination_ref: string | null
  status: PayoutStatus
  created_at: string
  paid_at: string | null
  org_name: string | null
}

interface AdminLedgerRow {
  org_id: string
  type: string | null
  amount_cents: number | null
  occurred_at: string | null
}

interface AdminPayoutBalanceRow {
  org_id: string
  amount_cents: number | null
  status: string | null
}

const STATUS_ORDER: PayoutStatus[] = ["requested", "processing", "failed", "paid", "cancelled"]

const STATUS_META: Record<PayoutStatus, { label: string; tone: string; blurb: string }> = {
  requested: { label: "Requested", tone: "bg-[#fdf6ed] text-[#c1841c]", blurb: "Awaiting review" },
  processing: { label: "Processing", tone: "bg-accent-soft text-accent", blurb: "Being settled" },
  failed: { label: "Failed", tone: "bg-[#fdf0ec] text-[#c1422b]", blurb: "Needs attention" },
  paid: { label: "Paid", tone: "bg-accent-soft text-accent", blurb: "Settled" },
  cancelled: { label: "Cancelled", tone: "bg-line/50 text-ink-3", blurb: "Closed" },
}

function money(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toLocaleString("en", { maximumFractionDigits: 2 })}`
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })
}

function TransitionForm({
  action,
  payoutId,
  label,
  variant,
}: {
  action: (payoutId: string, formData?: FormData) => Promise<void>
  payoutId: string
  label: string
  variant: "accent" | "default" | "danger"
}) {
  return (
    <form action={action.bind(null, payoutId)}>
      <Button type="submit" size="xs" variant={variant === "danger" ? "default" : variant}>
        {label}
      </Button>
    </form>
  )
}

function actionsFor(status: PayoutStatus, payoutId: string) {
  switch (status) {
    case "requested":
      return (
        <>
          <TransitionForm action={markPayoutProcessingAction} payoutId={payoutId} label="Start processing" variant="accent" />
          <TransitionForm action={cancelPayoutAction} payoutId={payoutId} label="Cancel" variant="default" />
        </>
      )
    case "processing":
      return (
        <>
          <TransitionForm action={markPayoutPaidAction} payoutId={payoutId} label="Mark paid" variant="accent" />
          <TransitionForm action={markPayoutFailedAction} payoutId={payoutId} label="Mark failed" variant="default" />
        </>
      )
    case "failed":
      return (
        <>
          <TransitionForm action={markPayoutProcessingAction} payoutId={payoutId} label="Retry processing" variant="accent" />
          <TransitionForm action={cancelPayoutAction} payoutId={payoutId} label="Cancel" variant="default" />
        </>
      )
    default:
      return null
  }
}

export default async function SuperAdminPayoutsPage() {
  // Transitions themselves are super_admin-gated inside finance-actions; this
  // view is readable by finance + read-only tiers too.
  const { roleTier } = await requireAdminRole(["super_admin", "finance_admin", "read_only_admin"])
  const canTransition = roleTier === "super_admin"
  const admin = createAdminClient()
  const reconciliation = await getPostEventReconciliationOverview({ limit: 40 })

  const { data, error } = await admin
    .from("payouts")
    .select("id, org_id, amount_cents, currency, provider, destination_ref, status, created_at, paid_at, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(500)

  if (error) {
    return (
      <div className="p-7">
        <h1 className="text-h1">Payouts</h1>
        <p className="mt-2 text-[13px] text-danger">Failed to load payouts: {error.message}</p>
      </div>
    )
  }

  const rows: PayoutRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    org_id: row.org_id,
    amount_cents: row.amount_cents,
    currency: row.currency,
    provider: row.provider,
    destination_ref: row.destination_ref,
    status: row.status,
    created_at: row.created_at,
    paid_at: row.paid_at,
    org_name: row.organizations?.name ?? null,
  }))
  const orgIds = Array.from(new Set(rows.map((row) => row.org_id)))
  const settlementByOrg = new Map<string, SettlementSummary>()

  if (orgIds.length > 0) {
    const [ledgerRes, payoutBalanceRes] = await Promise.all([
      admin
        .from("ledger_entries")
        .select("org_id, type, amount_cents, occurred_at")
        .in("org_id", orgIds),
      admin
        .from("payouts")
        .select("org_id, amount_cents, status")
        .in("org_id", orgIds),
    ])

    if (ledgerRes.error) console.error("[super-admin/payouts] ledger_entries:", ledgerRes.error)
    if (payoutBalanceRes.error) console.error("[super-admin/payouts] payouts:", payoutBalanceRes.error)

    const ledgerByOrg = new Map<string, AdminLedgerRow[]>()
    for (const row of (ledgerRes.data ?? []) as AdminLedgerRow[]) {
      const list = ledgerByOrg.get(row.org_id) ?? []
      list.push(row)
      ledgerByOrg.set(row.org_id, list)
    }

    const payoutsByOrg = new Map<string, AdminPayoutBalanceRow[]>()
    for (const row of (payoutBalanceRes.data ?? []) as AdminPayoutBalanceRow[]) {
      const list = payoutsByOrg.get(row.org_id) ?? []
      list.push(row)
      payoutsByOrg.set(row.org_id, list)
    }

    for (const orgId of orgIds) {
      settlementByOrg.set(orgId, buildSettlementSummary({
        ledgerEntries: (ledgerByOrg.get(orgId) ?? []).map((row) => ({
          type: row.type,
          amountCents: row.amount_cents ?? 0,
          occurredAt: row.occurred_at,
        })),
        payouts: (payoutsByOrg.get(orgId) ?? []).map((row) => ({
          status: row.status,
          amountCents: row.amount_cents ?? 0,
        })),
      }))
    }
  }

  const settlementTotals = Array.from(settlementByOrg.values()).reduce(
    (totals, summary) => ({
      payable: totals.payable + summary.settledAvailableCents,
      pending: totals.pending + summary.pendingSettlementCents,
    }),
    { payable: 0, pending: 0 },
  )

  const byStatus = new Map<PayoutStatus, PayoutRow[]>()
  for (const status of STATUS_ORDER) byStatus.set(status, [])
  for (const row of rows) byStatus.get(row.status)?.push(row)

  return (
    <div className="flex flex-col gap-5 p-7">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">MONEY / PAYOUTS</div>
        <h1 className="text-h1 mt-1">Payout queue</h1>
        <p className="mt-1 text-[13px] text-ink-3">
          Review organizer payout requests and move them through settlement. Every status change is written to the audit log.
        </p>
      </div>

      <Card className={reconciliation.totals.blocked > 0 ? "border-danger/40" : "border-accent/30"}>
        <CardBody className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Icon name={reconciliation.totals.blocked > 0 ? "bell" : "check"} size={15} className={reconciliation.totals.blocked > 0 ? "text-danger" : "text-accent"} />
              Post-event reconciliation
            </p>
            <p className="mt-1 text-[12px] leading-5 text-ink-3">
              {reconciliation.totals.blocked > 0
                ? `${reconciliation.totals.blocked} ended event${reconciliation.totals.blocked === 1 ? "" : "s"} need finance review before payout release.`
                : "Ended events in the current window are clear for payout review."}
            </p>
          </div>
          <Link
            href="/super-admin/reconciliation"
            className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[12px] font-semibold text-ink transition hover:bg-bg"
          >
            Open reconciliation <Icon name="arrowR" size={12} />
          </Link>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Icon name="wallet" size={15} className="text-accent" />
              Settlement guardrail
            </p>
            <p className="mt-1 text-[12px] leading-5 text-ink-3">
              Requested payouts are checked against settled funds, with captured-but-pending revenue held out of approval.
            </p>
          </div>
          <div className="rounded-[var(--radius)] border border-line px-3 py-2">
            <p className="text-label">Payable across queue</p>
            <p className="mt-1 font-mono text-[13px] font-semibold">{money(settlementTotals.payable, "SZL")}</p>
          </div>
          <div className="rounded-[var(--radius)] border border-line px-3 py-2">
            <p className="text-label">Pending settlement</p>
            <p className="mt-1 font-mono text-[13px] font-semibold">{money(settlementTotals.pending, "SZL")}</p>
          </div>
        </CardBody>
      </Card>

      {/* Status summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {STATUS_ORDER.map((status) => {
          const list = byStatus.get(status) ?? []
          const total = list.reduce((sum, r) => sum + r.amount_cents, 0)
          const currency = list[0]?.currency ?? "SZL"
          return (
            <Card key={status} className="p-3">
              <div className="text-label">{STATUS_META[status].label}</div>
              <div className="mt-1 font-mono text-xl font-semibold">{list.length}</div>
              <div className="mt-0.5 font-mono text-[10px] text-ink-3">
                {list.length > 0 ? money(total, currency) : STATUS_META[status].blurb}
              </div>
            </Card>
          )
        })}
      </div>

      {rows.length === 0 && (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Icon name="wallet" size={20} className="text-ink-3" />
            <p className="text-[14px] font-semibold">No payouts yet</p>
            <p className="text-[12px] text-ink-3">Organizer payout requests will appear here for review.</p>
          </CardBody>
        </Card>
      )}

      {STATUS_ORDER.map((status) => {
        const list = byStatus.get(status) ?? []
        if (list.length === 0) return null
        return (
          <section key={status} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${STATUS_META[status].tone}`}>
                {STATUS_META[status].label}
              </span>
              <span className="font-mono text-[11px] text-ink-3">{list.length}</span>
            </div>
            <Card className="overflow-hidden">
              {list.map((row, i) => {
                const settlement = settlementByOrg.get(row.org_id)
                return (
                <div
                  key={row.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i < list.length - 1 ? "border-b border-line" : ""}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-semibold">{row.org_name ?? row.org_id.slice(0, 8)}</span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {row.provider}
                      {row.destination_ref ? ` · ${row.destination_ref}` : ""} · requested {formatDate(row.created_at)}
                      {row.paid_at ? ` · paid ${formatDate(row.paid_at)}` : ""}
                    </span>
                    {settlement && (
                      <span className="font-mono text-[11px] text-ink-3">
                        payable {money(settlement.settledAvailableCents, row.currency)} · pending settlement{" "}
                        {money(settlement.pendingSettlementCents, row.currency)} · {settlement.settlementHoldDays}-day buffer
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[14px] font-semibold">{money(row.amount_cents, row.currency)}</span>
                  {canTransition && <div className="flex items-center gap-2">{actionsFor(row.status, row.id)}</div>}
                </div>
                )
              })}
            </Card>
          </section>
        )
      })}
    </div>
  )
}
