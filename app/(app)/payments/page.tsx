import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export const dynamic = "force-dynamic"

export default async function PaymentsPage() {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")
  const demoSession = demoSessionCookie ? JSON.parse(demoSessionCookie.value) : null

  // Mock payments for demo mode
  const mockPayments = [
    {
      id: "payment_1",
      amount: 15000,
      currency: "ZAR",
      status: "completed",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      order: {
        id: "order_1",
        event: {
          title: "Vodacom Bulls Championship Match",
        },
      },
    },
    {
      id: "payment_2",
      amount: 8500,
      currency: "ZAR",
      status: "completed",
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      order: {
        id: "order_2",
        event: {
          title: "Betway SA20 Season 4",
        },
      },
    },
  ]

  let payments = []

  if (demoSession) {
    console.log("[v0] Using demo payments data")
    payments = mockPayments
  } else {
    const supabase = createServerSupabaseClient()

    if (!supabase) {
      console.log("[v0] Supabase not configured, using mock data")
      payments = mockPayments
    } else {
      // Only try to get session if supabase exists
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) redirect("/login")

      const { data } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          currency,
          status,
          created_at,
          order:orders(id, event_id, event:events(title))
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })

      payments = data || []
    }
  }

  return (
    <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">View all your payments and transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment history</p>
          ) : (
            <div className="space-y-4">
              {payments.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between border-b pb-4 last:border-b-0">
                  <div>
                    <p className="font-medium">{payment.order?.event?.title}</p>
                    <p className="text-sm text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">R{(payment.amount / 100).toFixed(2)}</p>
                    <Badge variant={payment.status === "completed" ? "default" : "secondary"}>{payment.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
