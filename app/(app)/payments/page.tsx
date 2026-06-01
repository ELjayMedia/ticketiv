import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"

export const dynamic = "force-dynamic"

export default async function PaymentsPage() {
  const supabase = await createServerSupabaseClient()

  if (!supabase) {
    return redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  let payments: any[] = []

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("payments")
    .select(`
      id,
      amount_cents,
      currency,
      status,
      created_at,
      orders!inner(id, buyer_id)
    `)
    .eq("orders.buyer_id", session.user.id)
    .order("created_at", { ascending: false })

  if (!paymentsError && paymentsData) {
    payments = paymentsData.map((payment: any) => ({
      ...payment,
      amount: payment.amount_cents,
      order: {
        id: payment.orders?.id,
        event_title: "Order #" + (payment.orders?.id?.slice(0, 8) ?? "unknown"),
      },
    }))
  }

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-6 px-4 py-8 lg:px-6 lg:py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1">Payment history</h1>
        <p className="text-[13px] text-ink-3">View all your payments and transactions.</p>
      </div>

      <Card>
        <CardBody className="px-5 py-4">
          <p className="text-label">Transactions</p>
        </CardBody>
        <CardDivider />

        {payments.length === 0 ? (
          <CardBody className="px-5 py-10 text-center">
            <p className="text-[13px] text-ink-3">No payment history yet.</p>
          </CardBody>
        ) : (
          payments.map((payment, i) => (
            <div key={payment.id}>
              {i > 0 && <CardDivider />}
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <p className="text-[14px] font-semibold text-ink">
                    {payment.order?.event_title || "Unknown order"}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    {new Date(payment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <p className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                    {payment.currency || "SZL"} {(payment.amount / 100).toFixed(2)}
                  </p>
                  <Chip
                    size="sm"
                    variant={payment.status === "completed" ? "accent" : "muted"}
                  >
                    {payment.status}
                  </Chip>
                </div>
              </div>
            </div>
          ))
        )}
      </Card>
    </main>
  )
}
