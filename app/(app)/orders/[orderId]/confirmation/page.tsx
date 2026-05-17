import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { getOrderById } from "@/lib/data/orders"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import {
  CheckCircle2,
  Download,
  Wallet,
  Ticket,
  Calendar,
  MapPin,
  Mail,
  CreditCard,
  ArrowRight,
  ChevronRight,
} from "lucide-react"
import QRCode from "react-qr-code"

export const dynamic = "force-dynamic"

export default async function OrderConfirmationPage({ params }: { params: { orderId: string } }) {
  const order = await getOrderById(params.orderId)

  if (!order) notFound()

  const demoSession = await getDemoSessionFromCookie()
  if (demoSession) {
    if (order.purchaser_id !== demoSession.id && order.buyer_id !== demoSession.id) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Not authorized to view this order</p>
              <Button asChild className="mt-4">
                <Link href="/app/home">Go Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
  } else {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user || (order.purchaser_id !== user.id && order.buyer_id !== user.id)) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Not authorized to view this order</p>
              <Button asChild className="mt-4">
                <Link href="/app/home">Go Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }
  }

  const latestPayment = order.payments?.[0]
  if (order.status !== "paid" && order.status !== "confirmed") {
    redirect(`/app/orders/${params.orderId}/failed`)
  }

  if (latestPayment && latestPayment.status !== "succeeded" && latestPayment.status !== "completed") {
    redirect(`/app/orders/${params.orderId}/failed`)
  }

  const eventInfo = order.order_items?.[0]?.event || null
  const venue = eventInfo?.venue || null

  const subtotalCents = order.subtotal_cents ?? order.total_cents ?? 0
  const feesCents =
    (order.order_adjustments
      ?.filter((adj: any) => adj.type === "fee")
      .reduce((sum: number, adj: any) => sum + (adj.amount_cents || 0), 0) || 0) ||
    (order.platform_fee_cents || 0) + (order.processor_fee_cents || 0)
  const discountsCents =
    order.order_adjustments
      ?.filter((adj: any) => adj.type === "discount" || adj.type === "promo")
      .reduce((sum: number, adj: any) => sum + Math.abs(adj.amount_cents || 0), 0) || 0
  const totalCents = order.total_cents ?? subtotalCents + feesCents - discountsCents

  const subtotal = subtotalCents / 100
  const fees = feesCents / 100
  const discounts = discountsCents / 100
  const total = totalCents / 100

  const eventDate = eventInfo?.starts_at
    ? new Date(eventInfo.starts_at).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBA"

  const eventTime = eventInfo?.starts_at
    ? new Date(eventInfo.starts_at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : ""

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-gradient-to-b from-background via-primary/5 to-background">
        <div className="px-4 py-8 space-y-6">
          {/* Success Hero */}
          <div className="text-center space-y-4 py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-2">
              <CheckCircle2 className="h-12 w-12 text-green-500" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-balance">Payment Successful!</h1>
              <p className="text-muted-foreground">Your tickets have been confirmed</p>
            </div>
          </div>

          {/* Order Number */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-mono font-semibold">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <Badge className="bg-green-500 hover:bg-green-600">Confirmed</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Event Info */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold mb-2">{eventInfo?.title || "Event"}</h2>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{eventDate}</p>
                    {eventTime && <p className="text-xs text-muted-foreground">{eventTime}</p>}
                  </div>
                </div>

                {venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{venue.name}</p>
                      <p className="text-xs text-muted-foreground">{venue.address_line1 || venue.city}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Confirmation sent to</p>
                    <p className="text-xs text-muted-foreground">{order.purchaser_email || order.buyer_email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Line Items */}
              <div className="space-y-3">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.ticket_type?.name || "Ticket"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</p>
                    </div>
                    <p className="font-medium">${((item.unit_price_cents || item.unit_price || 0) / 100).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {fees > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fees</span>
                    <span>${fees.toFixed(2)}</span>
                  </div>
                )}
                {discounts > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-${discounts.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>

              {/* Payment Method */}
              {latestPayment && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>
                      {latestPayment.provider === "deltapay"
                        ? "DeltaPay"
                        : latestPayment.provider === "paystack"
                          ? "Paystack"
                          : "Card Payment"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Your Tickets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.order_items?.map((item: any, idx: number) => (
                <Link key={item.id} href={`/app/tickets/${item.id}`}>
                  <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-16 h-16 bg-white rounded-lg p-2 shrink-0 shadow-sm">
                      <QRCode value={item.ticket_code || `TICKET-${item.id}`} size={48} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.ticket_type?.name || "Ticket"}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</p>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.checked_in_at ? "Checked In" : "Valid"}
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button asChild className="w-full h-12">
              <Link href="/app/tickets">
                View All Tickets
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" className="w-full h-12 bg-transparent" disabled>
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </Button>
            <Button variant="outline" className="w-full h-12 bg-transparent" disabled>
              <Wallet className="h-4 w-4 mr-2" />
              Add to Wallet
            </Button>
          </div>

          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              Questions about your order?{" "}
              <Link href="/help" className="underline">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[980px] space-y-8 px-4 py-12 sm:px-6 lg:px-8">
          {/* Success Hero */}
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-16 w-16 text-green-500" strokeWidth={2} />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-balance">Payment Successful!</h1>
              <p className="text-lg text-muted-foreground">
                Your order has been confirmed. Tickets have been sent to{" "}
                <span className="font-medium text-foreground">{order.purchaser_email || order.buyer_email}</span>
              </p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Order Details</CardTitle>
                    <Badge className="bg-green-500 hover:bg-green-600">Confirmed</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Number</p>
                    <p className="font-mono text-lg font-semibold">#{order.id.slice(0, 12).toUpperCase()}</p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">{eventInfo?.title || "Event"}</h3>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Date & Time</p>
                          <p className="font-medium">{eventDate}</p>
                          {eventTime && <p className="text-sm text-muted-foreground">{eventTime}</p>}
                        </div>
                      </div>

                      {venue && (
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-muted-foreground">Venue</p>
                            <p className="font-medium">{venue.name}</p>
                            <p className="text-sm text-muted-foreground">{venue.address_line1 || venue.city}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tickets */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    Your Tickets ({order.order_items?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {order.order_items?.map((item: any) => (
                    <Link key={item.id} href={`/app/tickets/${item.id}`}>
                      <div className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors group">
                        <div className="w-20 h-20 bg-white rounded-lg p-3 shrink-0 shadow-sm">
                          <QRCode value={item.ticket_code || `TICKET-${item.id}`} size={56} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-semibold">{item.ticket_type?.name || "Ticket"}</p>
                          <p className="text-sm text-muted-foreground">Quantity: {item.quantity || 1}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.checked_in_at ? "Checked In" : "Valid"}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              {item.ticket_code?.slice(0, 12)}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    </Link>
                  ))}

                  <Button asChild className="w-full mt-4">
                    <Link href="/app/tickets">
                      View All Tickets
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Line Items */}
                  <div className="space-y-3">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{item.ticket_type?.name || "Ticket"}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.quantity || 1}</p>
                        </div>
                        <p className="font-medium">
                          ${((item.unit_price_cents || item.unit_price || 0) / 100).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {fees > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees</span>
                        <span>${fees.toFixed(2)}</span>
                      </div>
                    )}
                    {discounts > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-${discounts.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>

                  {latestPayment && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CreditCard className="h-4 w-4" />
                        <span>
                          Paid via{" "}
                          {latestPayment.provider === "deltapay"
                            ? "DeltaPay"
                            : latestPayment.provider === "paystack"
                              ? "Paystack"
                              : "Card Payment"}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full bg-transparent" disabled>
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                  <Button variant="outline" className="w-full bg-transparent" disabled>
                    <Wallet className="h-4 w-4 mr-2" />
                    Add to Wallet
                  </Button>
                  <Button variant="outline" asChild className="w-full bg-transparent">
                    <Link href="/help">Need Help?</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
