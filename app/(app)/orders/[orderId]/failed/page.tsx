import { getOrderById } from "@/lib/data/orders"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { XCircle, RefreshCcw, Mail, ArrowLeft, CreditCard, AlertCircle, Clock } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OrderFailedPage({ params }: { params: { orderId: string } }) {
  const order = await getOrderById(params.orderId)

  if (!order) {
    notFound()
  }

  if (order.status === "paid" || order.status === "completed") {
    redirect(`/app/orders/${params.orderId}/confirmation`)
  }

  const isExpired = order.status === "expired" || order.status === "cancelled"
  const isFailed = order.status === "failed" || order.status === "pending"

  const latestPayment = order.payments?.[0]
  const paymentError = latestPayment?.payload?.error_message || latestPayment?.payload?.last_error

  const orderItems = order.order_items || []
  const totalItems = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)

  const subtotal = order.subtotal_cents || 0
  const fees = (order.platform_fee_cents || 0) + (order.processor_fee_cents || 0)
  const total = order.total_cents || 0

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-gradient-to-b from-background to-destructive/5">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
          <Link href="/app/home">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{isExpired ? "Order Expired" : "Payment Failed"}</h1>
          </div>
        </div>

        <div className="px-4 py-8 space-y-6">
          {/* Error Hero */}
          <div className="text-center space-y-4 py-6">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-2 ${
                isExpired ? "bg-muted" : "bg-destructive/10"
              }`}
            >
              {isExpired ? (
                <Clock className="h-12 w-12 text-muted-foreground" strokeWidth={2} />
              ) : (
                <XCircle className="h-12 w-12 text-destructive" strokeWidth={2} />
              )}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-balance">{isExpired ? "Order Expired" : "Payment Failed"}</h1>
              <p className="text-muted-foreground">
                {isExpired ? "This order has expired and cannot be completed" : "Your order could not be completed"}
              </p>
            </div>
          </div>

          {/* Order Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-mono font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <Badge variant={isExpired ? "secondary" : "destructive"}>
                  {order.status === "expired"
                    ? "Expired"
                    : order.status === "cancelled"
                      ? "Cancelled"
                      : order.status === "failed"
                        ? "Failed"
                        : "Pending"}
                </Badge>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-medium">
                    {totalItems} {totalItems === 1 ? "ticket" : "tickets"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">E{(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{isExpired ? "What Happened?" : "Why Did This Fail?"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isExpired ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This order was not completed within the allowed time window. Orders expire after 30 minutes to
                    ensure ticket availability for other customers.
                  </p>
                  <div className="bg-muted/50 p-3 rounded-lg flex gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Tickets are still available. You can create a new order to purchase tickets for this event.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {paymentError ||
                      (latestPayment?.status === "failed"
                        ? "Your payment was declined. This may be due to insufficient funds, an expired card, or a security check by your bank."
                        : "The payment process was not completed. Your tickets have not been confirmed.")}
                  </p>

                  {latestPayment && (
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method</span>
                        <span className="font-medium capitalize">{latestPayment.provider || "Card"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="font-medium capitalize">{latestPayment.status}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            {isExpired ? (
              <>
                <Button asChild className="w-full h-12">
                  <Link href={`/events/${order.event_id}`}>View Event</Link>
                </Button>
                <Button variant="outline" asChild className="w-full h-12 bg-transparent">
                  <Link href="/browse">Browse Events</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="w-full h-12">
                  <Link href={`/app/checkout/${order.event_id}`}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full h-12 bg-transparent">
                  <Link href={`/app/checkout/${order.event_id}`}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Change Payment Method
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="w-full h-12">
                  <Link href="/help">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              {isExpired ? "No charges were made" : "No charges were made to your account"}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[680px] space-y-8 px-4 py-12 sm:px-6 lg:px-8">
          {/* Error Hero */}
          <div className="text-center space-y-6 py-8">
            <div
              className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
                isExpired ? "bg-muted" : "bg-destructive/10"
              }`}
            >
              {isExpired ? (
                <Clock className="h-16 w-16 text-muted-foreground" strokeWidth={2} />
              ) : (
                <XCircle className="h-16 w-16 text-destructive" strokeWidth={2} />
              )}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-balance">{isExpired ? "Order Expired" : "Payment Failed"}</h1>
              <p className="text-lg text-muted-foreground">
                {isExpired ? "This order has expired and cannot be completed" : "Your order could not be completed"}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Information</CardTitle>
                <Badge variant={isExpired ? "secondary" : "destructive"}>
                  {order.status === "expired"
                    ? "Expired"
                    : order.status === "cancelled"
                      ? "Cancelled"
                      : order.status === "failed"
                        ? "Failed"
                        : "Pending"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-mono text-lg font-semibold">#{order.id.slice(0, 12).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-lg font-semibold">E{(total / 100).toFixed(2)}</p>
                </div>
              </div>

              <Separator />

              {/* Order Summary */}
              <div>
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  {orderItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-muted-foreground">{item.quantity || 1}x Ticket</span>
                      <span>E{((item.unit_price_cents || 0) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>E{(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fees</span>
                    <span>E{(fees / 100).toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>E{(total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">{isExpired ? "What Happened?" : "Why Did This Fail?"}</h3>

                {isExpired ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      This order was not completed within the allowed time window. Orders expire after 30 minutes to
                      ensure ticket availability for other customers.
                    </p>
                    <div className="bg-muted/50 p-4 rounded-lg flex gap-3">
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        Tickets are still available. You can create a new order to purchase tickets for this event.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {paymentError ||
                        (latestPayment?.status === "failed"
                          ? "Your payment was declined. This may be due to insufficient funds, an expired card, or a security check by your bank."
                          : "The payment process was not completed. Your tickets have not been confirmed.")}
                    </p>

                    {latestPayment && (
                      <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Payment Method</span>
                          <span className="font-medium capitalize">{latestPayment.provider || "Card"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <span className="font-medium capitalize">{latestPayment.status}</span>
                        </div>
                        {latestPayment.ext_payment_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Reference</span>
                            <span className="font-mono text-xs">{latestPayment.ext_payment_id}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                {isExpired ? (
                  <>
                    <Button asChild className="w-full">
                      <Link href={`/events/${order.event_id}`}>View Event</Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full bg-transparent">
                      <Link href="/browse">Browse Events</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild className="w-full">
                      <Link href={`/app/checkout/${order.event_id}`}>
                        <RefreshCcw className="h-4 w-4 mr-2" />
                        Try Again
                      </Link>
                    </Button>
                    <Button variant="outline" asChild className="w-full bg-transparent">
                      <Link href={`/app/checkout/${order.event_id}`}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Change Payment Method
                      </Link>
                    </Button>
                    <Button variant="ghost" asChild className="w-full">
                      <Link href="/help">
                        <Mail className="h-4 w-4 mr-2" />
                        Contact Support
                      </Link>
                    </Button>
                  </>
                )}
              </div>

              <p className="text-center text-sm text-muted-foreground pt-4">
                {isExpired ? "No charges were made" : "No charges were made to your account"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
