import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function FinancePage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return <div className="p-4 text-center">Supabase not configured</div>
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: orgMember } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", session.user.id)
    .single()

  if (!orgMember) redirect("/app")

  const { data: payouts = [] } = await supabase
    .from("payouts")
    .select("*")
    .eq("org_id", orgMember.org_id)
    .order("created_at", { ascending: false })

  const { data: ledger = [] } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("org_id", orgMember.org_id)
    .order("occurred_at", { ascending: false })
    .limit(10)

  const totalRevenue = ledger
    .filter((entry: any) => entry.type === "charge")
    .reduce((sum, entry: any) => sum + entry.amount, 0)

  const totalPaid = payouts
    .filter((payout: any) => payout.status === "completed")
    .reduce((sum, payout: any) => sum + payout.amount, 0)

  return (
    <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold">Finance & Payouts</h1>
        <p className="text-muted-foreground">Manage payouts and view financial reports</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(totalRevenue / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(totalPaid / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${((totalRevenue - totalPaid) / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payouts yet</p>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout: any) => (
                <div key={payout.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">${(payout.amount / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">{new Date(payout.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={payout.status === "completed" ? "default" : "secondary"}>{payout.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions</p>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between text-sm p-2 border-b last:border-b-0">
                  <div>
                    <p className="font-medium capitalize">{entry.type}</p>
                    <p className="text-muted-foreground">{entry.description || "Transaction"}</p>
                  </div>
                  <p className="font-semibold">${(entry.amount / 100).toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
