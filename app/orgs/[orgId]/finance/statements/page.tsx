import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

export const dynamic = "force-dynamic"
export const metadata = { title: "Statements" }

function fmt(cents: number, currency: string) {
  return `${currency} ${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
}

export default async function StatementsPage({ params }: { params: Promise<{ orgId: string }> }) {
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

  const { data: payouts } = await supabase
    .from("payouts")
    .select("id, amount_cents, currency, provider, destination_ref, status, created_at, paid_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100)

  const rows = payouts ?? []

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
            <h1 className="text-h1">Statements</h1>
            <p className="text-[13px] text-ink-3">{org.name} · payout history</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <Card flat className="border-dashed">
            <CardBody className="flex flex-col items-center gap-4 px-4 py-16 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-ink-3">
                <Icon name="fileText" size={28} />
              </span>
              <div className="flex max-w-sm flex-col items-center gap-2">
                <h2 className="text-h1">No statements yet</h2>
                <p className="text-[13px] text-ink-3">
                  Payout statements will appear here once your first payout is processed.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="px-5 py-3">
              <p className="text-label">{rows.length} payout{rows.length === 1 ? "" : "s"}</p>
            </CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="px-5 py-3 text-left text-label">Date</th>
                    <th className="px-5 py-3 text-left text-label">Amount</th>
                    <th className="px-5 py-3 text-left text-label">Provider</th>
                    <th className="px-5 py-3 text-left text-label">Destination</th>
                    <th className="px-5 py-3 text-left text-label">Status</th>
                    <th className="px-5 py-3 text-left text-label">Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={[i > 0 ? "border-t border-line" : "", "transition-colors hover:bg-bg"].join(" ")}
                    >
                      <td className="px-5 py-3 font-mono text-[13px] text-ink-3">
                        {new Date(row.created_at ?? "").toLocaleDateString("en-SZ")}
                      </td>
                      <td className="px-5 py-3 font-mono text-[13px] font-semibold text-ink">
                        {fmt(row.amount_cents, row.currency ?? currency)}
                      </td>
                      <td className="px-5 py-3 font-mono text-[13px] text-ink-3 capitalize">
                        {row.provider ?? "—"}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-ink-3">
                        {row.destination_ref ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Chip
                          size="sm"
                          variant={row.status === "paid" ? "active" : row.status === "failed" ? "default" : "muted"}
                          className="capitalize"
                        >
                          {row.status}
                        </Chip>
                      </td>
                      <td className="px-5 py-3 font-mono text-[13px] text-ink-3">
                        {row.paid_at ? new Date(row.paid_at).toLocaleDateString("en-SZ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  )
}
