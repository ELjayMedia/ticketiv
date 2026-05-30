import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ledger" }

function fmt(cents: number, currency: string) {
  const sign = cents < 0 ? "−" : "+"
  return `${sign}${currency} ${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
}

export default async function LedgerPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: org } = await supabase
    .from("organizations")
    .select("name, default_currency")
    .eq("id", orgId)
    .maybeSingle()
  if (!org) return redirect("/403")

  const currency = org.default_currency ?? "SZL"

  const { data: entries } = await supabase
    .from("ledger_entries")
    .select("id, type, amount_cents, currency, occurred_at, order_id, payment_id, refund_id, payout_id, meta")
    .eq("org_id", orgId)
    .order("occurred_at", { ascending: false })
    .limit(500)

  const rows = entries ?? []

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-8 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/payouts`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-h1">Ledger</h1>
            <p className="text-[13px] text-ink-3">{org.name} · double-entry financial ledger</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <Card flat className="border-dashed">
            <CardBody className="flex flex-col items-center gap-4 px-4 py-16 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-ink-3">
                <Icon name="trending" size={28} />
              </span>
              <div className="flex max-w-sm flex-col items-center gap-2">
                <h2 className="text-h1">No ledger entries yet</h2>
                <p className="text-[13px] text-ink-3">
                  Every charge, refund, fee, and payout will appear here once orders are placed.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="px-5 py-3">
              <p className="text-label">{rows.length} entr{rows.length === 1 ? "y" : "ies"}</p>
            </CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-left text-label">Date</th>
                    <th className="px-5 py-3 text-left text-label">Type</th>
                    <th className="px-5 py-3 text-right text-label">Amount</th>
                    <th className="px-5 py-3 text-left text-label">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const ref = row.order_id ?? row.payment_id ?? row.refund_id ?? row.payout_id ?? "—"
                    const shortRef = ref === "—" ? "—" : ref.slice(0, 8) + "…"
                    return (
                      <tr
                        key={row.id}
                        className={[i > 0 ? "border-t border-line" : "", "transition-colors hover:bg-bg"].join(" ")}
                      >
                        <td className="px-5 py-2.5 font-mono text-[11px] text-ink-3">
                          {new Date(row.occurred_at).toLocaleDateString("en-SZ")}
                        </td>
                        <td className="px-5 py-2.5 font-mono text-[12px] text-ink capitalize">
                          {row.type.replaceAll("_", " ")}
                        </td>
                        <td className={
                          "px-5 py-2.5 text-right font-mono text-[13px] font-semibold tabular-nums " +
                          (row.amount_cents >= 0 ? "text-accent" : "text-ink")
                        }>
                          {fmt(row.amount_cents, row.currency ?? currency)}
                        </td>
                        <td className="px-5 py-2.5 font-mono text-[11px] text-ink-3" title={ref}>
                          {shortRef}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
