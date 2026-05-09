import { getPayoutSummary } from "@/lib/payouts"
import { formatCurrency } from "@/lib/pricing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function OrganizerPayoutsPage() {
  const summary = await getPayoutSummary()

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-muted-foreground">Monitor revenue and platform fees for each event you host.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payout Overview</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Gross Sales</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totals.grossSales)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Platform Fees</p>
            <p className="text-2xl font-semibold">{formatCurrency(summary.totals.platformFees)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net Payout</p>
            <p className="text-2xl font-semibold text-primary">{formatCurrency(summary.totals.netPayout)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {summary.rows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No payouts yet. Orders will appear here after attendees purchase tickets.
            </CardContent>
          </Card>
        ) : (
          summary.rows.map((row) => (
            <Card key={row.eventId} className="border-l-4 border-l-primary">
              <CardContent className="grid gap-4 py-6 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Event</p>
                  <p className="text-lg font-semibold">{row.eventTitle}</p>
                  <p className="text-sm text-muted-foreground">{row.ticketsSold} tickets sold</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gross</p>
                  <p className="font-semibold">{formatCurrency(row.grossSales)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Payout</p>
                  <p className="font-semibold text-primary">{formatCurrency(row.netPayout)}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
