import Link from "next/link"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { requireAdminRole } from "@/lib/super-admin/auth"

export const metadata = { title: "Reconciliation exports | Super Admin" }
export const dynamic = "force-dynamic"

// TICK-58 — Reconciliation exports for finance admins

const FINANCE_ROLES = ["super_admin", "finance_admin"] as const

type ExportDef = {
  kind: string
  label: string
  description: string
  icon: IconName
  columns: string
}

const EXPORTS: ExportDef[] = [
  {
    kind: "orders",
    label: "Orders",
    description: "All orders with buyer details, status, totals in cents and SZL, and channel.",
    icon: "fileText",
    columns: "id, org_id, buyer_email, status, total_cents, total_szl, currency, channel, created_at",
  },
  {
    kind: "payments",
    label: "Payments",
    description: "Payment records with provider reference for Paystack settlement reconciliation.",
    icon: "wallet",
    columns: "id, order_id, provider, status, amount_cents, amount_szl, currency, ext_payment_id, created_at",
  },
  {
    kind: "refunds",
    label: "Refunds",
    description: "Refund records including provider reference and processing status.",
    icon: "arrowL",
    columns: "id, payment_id, status, type, amount_cents, amount_szl, currency, provider_ref, processed_at, created_at",
  },
  {
    kind: "payouts",
    label: "Payouts",
    description: "Payout records with destination reference for bank reconciliation.",
    icon: "trending",
    columns: "id, org_id, status, amount_cents, amount_szl, currency, provider, destination_ref, paid_at, created_at",
  },
  {
    kind: "ledger",
    label: "Ledger entries",
    description: "All ledger entries typed by gross/fee/tax/refund/payout for period reconciliation.",
    icon: "filter",
    columns: "id, org_id, event_id, order_id, type, amount_cents, amount_szl, currency, occurred_at",
  },
  {
    kind: "ticket-holders",
    label: "Attendees",
    description: "Issued order items with holder name, email, check-in state and ticket code.",
    icon: "ticket",
    columns: "id, order_id, ticket_code, status, holder_name, holder_email, checked_in_at, created_at",
  },
  {
    kind: "audit",
    label: "Audit log",
    description: "Admin, finance and organizer action audit trail.",
    icon: "search",
    columns: "id, org_id, actor_id, table_name, action, record_id, changes, created_at",
  },
]

export default async function SuperAdminExportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>
}) {
  await requireAdminRole([...FINANCE_ROLES])
  const sp = searchParams ? await searchParams : {}
  const from = sp.from ?? ""
  const to = sp.to ?? ""

  function buildHref(kind: string) {
    const params = new URLSearchParams()
    if (from) params.set("from", from)
    if (to) params.set("to", to)
    const qs = params.toString()
    return `/api/super-admin/exports/${kind}${qs ? `?${qs}` : ""}`
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-col gap-2">
        <Link
          href="/super-admin"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
        >
          <Icon name="chevL" size={14} />
          Command centre
        </Link>
        <h1 className="text-h1">Reconciliation exports</h1>
        <p className="text-[13px] text-ink-3">
          Download CSV exports for reconciliation against provider (Paystack) settlement statements.
          All amounts exported in both cents and SZL decimal.
        </p>
      </div>

      {/* Date range filter */}
      <Card className="mb-6">
        <CardBody className="px-5 py-4">
          <p className="inline-flex items-center gap-2 text-h3">
            <Icon name="cal" size={16} className="text-ink-3" />
            Date range
          </p>
        </CardBody>
        <CardDivider />
        <CardBody className="p-5">
          <form className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-label">From</span>
              <input
                type="date"
                name="from"
                defaultValue={from}
                className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label">To</span>
              <input
                type="date"
                name="to"
                defaultValue={to}
                className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
              />
            </label>
            <button
              type="submit"
              className="rounded-[var(--radius)] border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-surface transition hover:bg-ink-2"
            >
              Apply range
            </button>
            {(from || to) && (
              <Link
                href="/super-admin/exports"
                className="rounded-[var(--radius)] px-4 py-2 text-[13px] font-semibold text-ink-3 transition hover:text-ink"
              >
                Clear
              </Link>
            )}
          </form>
          {(from || to) && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-accent">
              Filtering: {from || "all time"} → {to || "now"}
            </p>
          )}
        </CardBody>
      </Card>

      {/* Export grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((exp) => (
          <Card key={exp.kind} className="flex flex-col">
            <CardBody className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-[var(--radius-md)] border border-line bg-bg p-2 text-ink">
                  <Icon name={exp.icon} size={16} />
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-[15px] font-semibold text-ink">{exp.label}</h2>
                <p className="text-[12px] text-ink-3">{exp.description}</p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ink-4">
                {exp.columns}
              </p>
            </CardBody>
            <CardDivider />
            <CardBody className="p-4">
              <a
                href={buildHref(exp.kind)}
                download
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition hover:bg-ink-2"
              >
                <Icon name="download" size={14} />
                Download CSV
              </a>
            </CardBody>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-wider text-ink-3">
        Exports are gated to finance_admin and super_admin roles. All exports use the service-role client.
      </p>
    </main>
  )
}
