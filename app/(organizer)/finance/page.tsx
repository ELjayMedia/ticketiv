import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowDownToLine, TrendingUp, DollarSign, CreditCard, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { formatCurrency } from "@/lib/pricing"

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
    .limit(50)

  const { data: refunds = [] } = await supabase
    .from("refunds")
    .select("*, order:orders(id, total)")
    .eq("org_id", orgMember.org_id)
    .order("created_at", { ascending: false })
    .limit(20)

  // Calculate financial metrics
  const grossSales = ledger
    .filter((entry: any) => entry.type === "charge")
    .reduce((sum, entry: any) => sum + entry.amount, 0)

  const platformFees = ledger
    .filter((entry: any) => entry.type === "platform_fee")
    .reduce((sum, entry: any) => sum + Math.abs(entry.amount), 0)

  const processorFees = ledger
    .filter((entry: any) => entry.type === "processor_fee")
    .reduce((sum, entry: any) => sum + Math.abs(entry.amount), 0)

  const totalRefunded = refunds.filter((r: any) => r.status === "completed").reduce((sum, r: any) => sum + r.amount, 0)

  const netBalance = grossSales - platformFees - processorFees - totalRefunded

  const paidPayouts = payouts
    .filter((payout: any) => payout.status === "completed")
    .reduce((sum, payout: any) => sum + payout.amount, 0)

  const pendingPayouts = payouts
    .filter((payout: any) => payout.status === "pending")
    .reduce((sum, payout: any) => sum + payout.amount, 0)

  const failedPayouts = payouts.filter((payout: any) => payout.status === "failed")

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-background pb-6">
        <div className="space-y-4 p-4">
          <div>
            <h1 className="text-2xl font-bold">Finance</h1>
            <p className="text-sm text-muted-foreground">Manage financials & payouts</p>
          </div>

          {/* Mobile KPI Cards - 2 column grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs text-muted-foreground">Gross Sales</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{formatCurrency(grossSales)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs text-muted-foreground">Net Balance</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold text-primary">{formatCurrency(netBalance)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs text-muted-foreground">Platform Fees</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{formatCurrency(platformFees)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs text-muted-foreground">Processor Fees</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <p className="text-lg font-bold">{formatCurrency(processorFees)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Tabs */}
          <Tabs defaultValue="ledger" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ledger" className="text-xs">
                Ledger
              </TabsTrigger>
              <TabsTrigger value="payouts" className="text-xs">
                Payouts
              </TabsTrigger>
              <TabsTrigger value="refunds" className="text-xs">
                Refunds
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ledger" className="space-y-3 mt-4">
              {ledger.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No transactions yet
                  </CardContent>
                </Card>
              ) : (
                ledger.slice(0, 10).map((entry: any) => (
                  <Card key={entry.id}>
                    <CardContent className="p-3 flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium text-sm capitalize">{entry.type.replace("_", " ")}</p>
                        <p className="text-xs text-muted-foreground">{entry.description || "Transaction"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.occurred_at).toLocaleDateString()}
                        </p>
                      </div>
                      <p className={`font-bold text-sm ${entry.amount < 0 ? "text-destructive" : "text-primary"}`}>
                        {entry.amount < 0 ? "-" : "+"}
                        {formatCurrency(Math.abs(entry.amount))}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="payouts" className="space-y-3 mt-4">
              {payouts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">No payouts yet</CardContent>
                </Card>
              ) : (
                payouts.map((payout: any) => (
                  <Card key={payout.id}>
                    <CardContent className="p-3 flex justify-between items-center">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{formatCurrency(payout.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          payout.status === "completed"
                            ? "default"
                            : payout.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {payout.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="refunds" className="space-y-3 mt-4">
              {refunds.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No refunds processed
                  </CardContent>
                </Card>
              ) : (
                refunds.map((refund: any) => (
                  <Card key={refund.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{formatCurrency(refund.amount)}</p>
                          <p className="text-xs text-muted-foreground">{refund.reason || "No reason provided"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(refund.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            refund.status === "completed"
                              ? "default"
                              : refund.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {refund.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[1200px] space-y-8 px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Finance Dashboard</h1>
              <p className="text-muted-foreground">Comprehensive financial overview and ledger management</p>
            </div>
            <Button variant="outline" size="sm">
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Desktop KPI Cards - 5 column grid */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Gross Sales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(grossSales)}</p>
                <p className="text-xs text-muted-foreground mt-1">All ticket sales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(platformFees)}</p>
                <p className="text-xs text-muted-foreground mt-1">Service charges</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Processor Fees</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(processorFees)}</p>
                <p className="text-xs text-muted-foreground mt-1">Payment gateway</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Refunded</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalRefunded)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {refunds.filter((r: any) => r.status === "completed").length} refunds
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Balance</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{formatCurrency(netBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">Available balance</p>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Tabs */}
          <Tabs defaultValue="ledger" className="w-full">
            <TabsList>
              <TabsTrigger value="ledger">Transaction Ledger</TabsTrigger>
              <TabsTrigger value="payouts">
                Payouts
                {failedPayouts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {failedPayouts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="refunds">Refunds</TabsTrigger>
            </TabsList>

            <TabsContent value="ledger" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>All financial transactions across your events</CardDescription>
                </CardHeader>
                <CardContent>
                  {ledger.length === 0 ? (
                    <p className="py-12 text-center text-muted-foreground">No transactions yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ledger.map((entry: any) => (
                          <TableRow key={entry.id}>
                            <TableCell className="text-sm">
                              {new Date(entry.occurred_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {entry.type.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{entry.description || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {entry.event_id ? `Event ${entry.event_id.slice(0, 8)}` : "—"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={entry.amount < 0 ? "text-destructive" : "text-primary"}>
                                {entry.amount < 0 ? "-" : "+"}
                                {formatCurrency(Math.abs(entry.amount))}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payouts" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Paid Out
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(paidPayouts)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-600" />
                      Pending
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{formatCurrency(pendingPayouts)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      Failed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{failedPayouts.length}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Payout History</CardTitle>
                  <CardDescription>Track your payout status and history</CardDescription>
                </CardHeader>
                <CardContent>
                  {payouts.length === 0 ? (
                    <p className="py-12 text-center text-muted-foreground">No payouts yet</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.map((payout: any) => (
                          <TableRow key={payout.id}>
                            <TableCell className="text-sm">
                              {new Date(payout.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(payout.amount)}</TableCell>
                            <TableCell className="text-sm capitalize">{payout.method || "Bank Transfer"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground font-mono">
                              {payout.reference || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  payout.status === "completed"
                                    ? "default"
                                    : payout.status === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {payout.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {payout.status === "failed" && (
                                <Button size="sm" variant="ghost">
                                  Retry
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="refunds" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Refund History</CardTitle>
                  <CardDescription>Track refund requests and processing status</CardDescription>
                </CardHeader>
                <CardContent>
                  {refunds.length === 0 ? (
                    <p className="py-12 text-center text-muted-foreground">No refunds processed</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {refunds.map((refund: any) => (
                          <TableRow key={refund.id}>
                            <TableCell className="text-sm">
                              {new Date(refund.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-sm font-mono">{refund.order?.id?.slice(0, 8) || "—"}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(refund.amount)}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {refund.reason || "No reason provided"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  refund.status === "completed"
                                    ? "default"
                                    : refund.status === "failed"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {refund.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {refund.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline">
                                    Approve
                                  </Button>
                                  <Button size="sm" variant="ghost">
                                    Deny
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
