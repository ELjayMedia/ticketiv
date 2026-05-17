"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CreditCard, Mail, Smartphone } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/pricing"
import type { EventDetailData } from "@/lib/data/public/event-detail"
import { clearPendingCart, loadPendingCart, savePendingCart } from "@/lib/cart-persist"

interface CheckoutClientProps {
  event: EventDetailData
  selectedItemsParam?: string
  legacyTicketTypeId?: string
  legacyQuantity?: string
}

type CheckoutItem = {
  ticketTypeId: string
  quantity: number
}

function parseSelectedItems(input?: string, legacyTicketTypeId?: string, legacyQuantity?: string): CheckoutItem[] {
  if (input) {
    return input
      .split(",")
      .map((part) => {
        const [ticketTypeId, rawQuantity] = part.split(":")
        return { ticketTypeId: ticketTypeId?.trim(), quantity: Math.max(1, Number(rawQuantity) || 1) }
      })
      .filter((item) => item.ticketTypeId)
  }

  if (legacyTicketTypeId) return [{ ticketTypeId: legacyTicketTypeId, quantity: Math.max(1, Number(legacyQuantity) || 1) }]
  return []
}

export function CheckoutClient({ event, selectedItemsParam, legacyTicketTypeId, legacyQuantity }: CheckoutClientProps) {
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "momo">("paystack")
  const [momoPhone, setMomoPhone] = useState("")
  const [momoPending, setMomoPending] = useState(false)

  const [selectedItems, setSelectedItems] = useState<CheckoutItem[]>(() =>
    parseSelectedItems(selectedItemsParam, legacyTicketTypeId, legacyQuantity),
  )

  // Restore a selection that was persisted before an auth redirect. The URL
  // params take precedence when present; otherwise fall back to the saved cart.
  useEffect(() => {
    const cart = loadPendingCart()
    if (cart && cart.eventId === event.id && cart.items.length > 0) {
      setSelectedItems((current) => (current.length > 0 ? current : cart.items))
    }
    clearPendingCart()
  }, [event.id])

  const lineItems = useMemo(() => {
    return selectedItems
      .map((item) => {
        const ticketType = event.ticket_types.find((ticket) => ticket.id === item.ticketTypeId)
        if (!ticketType) return null
        return { ...item, ticketType, subtotalCents: ticketType.price_cents * item.quantity }
      })
      .filter(Boolean) as Array<{ ticketTypeId: string; quantity: number; ticketType: EventDetailData["ticket_types"][number]; subtotalCents: number }>
  }, [event.ticket_types, selectedItems])

  const currency = lineItems[0]?.ticketType.currency ?? event.ticket_types[0]?.currency ?? "SZL"
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.subtotalCents, 0)
  const totalQty = lineItems.reduce((sum, item) => sum + item.quantity, 0)
  const hasValidSelection = lineItems.length > 0 && totalQty > 0

  // Poll the MoMo status endpoint while the buyer approves the prompt.
  const pollMomoStatus = (orderId: string, referenceId: string, attempt = 0) => {
    const MAX_ATTEMPTS = 40 // ~2 minutes at 3s intervals
    window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/payments/momo/status?referenceId=${encodeURIComponent(referenceId)}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error ?? "Unable to check MoMo status")

        if (data.status === "SUCCESSFUL") {
          window.location.href = `/orders/${orderId}/confirmation`
          return
        }
        if (data.status === "FAILED") {
          setMomoPending(false)
          setLoading(false)
          toast.error("The MoMo payment was declined. Please try again.")
          return
        }
        if (attempt + 1 >= MAX_ATTEMPTS) {
          setMomoPending(false)
          setLoading(false)
          toast.error("Timed out waiting for MoMo approval. Please try again.")
          return
        }
        pollMomoStatus(orderId, referenceId, attempt + 1)
      } catch (error: any) {
        setMomoPending(false)
        setLoading(false)
        toast.error(error?.message ?? "Unable to check MoMo status.")
      }
    }, 3000)
  }

  const startMomoPayment = async (orderId: string) => {
    const res = await fetch("/api/payments/momo/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, msisdn: momoPhone }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.error ?? "Unable to start MoMo payment")
    if (!data.referenceId) throw new Error("MoMo did not return a reference")

    setMomoPending(true)
    toast("Check your phone — approve the MoMo prompt to complete payment.")
    pollMomoStatus(orderId, data.referenceId)
  }

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasValidSelection) {
      toast.error("Please go back and select at least one ticket.")
      return
    }

    setLoading(true)

    try {
      const orderResponse = await fetch(`/api/events/${event.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_email: email,
          buyer_phone: phone || null,
          items: lineItems.map((item) => ({ ticket_type_id: item.ticketTypeId, quantity: item.quantity })),
        }),
      })

      if (orderResponse.status === 401) {
        // Persist the selection so it can be restored after authentication.
        savePendingCart({
          eventId: event.id,
          items: selectedItems,
          returnPath: `/events/${event.id}/checkout`,
        })
        const redirectTo = encodeURIComponent(`/events/${event.id}/checkout`)
        window.location.href = `/login?redirectTo=${redirectTo}`
        return
      }

      const orderPayload = await orderResponse.json()
      if (!orderResponse.ok) throw new Error(orderPayload?.error ?? "Unable to create order")

      const orderId = orderPayload?.order?.id
      if (!orderId) throw new Error("Order was created without an ID")

      if (paymentMethod === "momo") {
        await startMomoPayment(orderId)
        return
      }

      const paymentResponse = await fetch("/api/payments/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, provider: "paystack", returnUrl: `${window.location.origin}/orders/${orderId}` }),
      })

      const paymentPayload = await paymentResponse.json()
      if (!paymentResponse.ok) throw new Error(paymentPayload?.error ?? "Unable to initialize Paystack payment")

      const checkoutUrl = paymentPayload?.payment?.checkoutUrl
      if (!checkoutUrl) throw new Error("Paystack did not return a checkout URL")

      window.location.href = checkoutUrl
    } catch (error: any) {
      console.error("Checkout error:", error)
      toast.error(error?.message ?? "Checkout failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b border-border/40 bg-background">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-4 py-4">
          <Link href={`/events/${event.id}`} className="inline-flex rounded-lg p-2 transition-colors hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Checkout</h1>
            <p className="text-xs text-muted-foreground">{event.title}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Order Summary</h2>

          {!hasValidSelection ? (
            <Card className="border-0 bg-muted/50">
              <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">No ticket selection was found. Please go back to the event and select tickets again.</CardContent>
            </Card>
          ) : (
            <Card className="border-0 bg-muted/50">
              <CardContent className="space-y-4 p-4">
                {lineItems.map((item) => (
                  <div key={item.ticketTypeId} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.ticketType.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.ticketType.price_cents, item.ticketType.currency)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.subtotalCents, item.ticketType.currency)}</p>
                  </div>
                ))}

                <div className="flex items-center justify-between border-t border-border/40 pt-4 font-bold">
                  <span>Total</span>
                  <span className="text-lg text-primary">{formatCurrency(subtotalCents, currency)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        <form onSubmit={handleCheckout} className="space-y-6">
          <section className="space-y-4">
            <h2 className="text-lg font-bold">Contact Information</h2>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number optional</Label>
              <Input id="phone" type="tel" placeholder="+268..." value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold">Payment Method</h2>

            <button type="button" onClick={() => setPaymentMethod("paystack")} disabled={momoPending} className="w-full text-left">
              <Card className={paymentMethod === "paystack" ? "border-2 border-primary bg-primary/5" : "border border-border/60"}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-background p-2">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Paystack</p>
                    <p className="text-xs text-muted-foreground">Pay securely by card or supported Paystack methods.</p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <button type="button" onClick={() => setPaymentMethod("momo")} disabled={momoPending} className="w-full text-left">
              <Card className={paymentMethod === "momo" ? "border-2 border-primary bg-primary/5" : "border border-border/60"}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-background p-2">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">MTN MoMo</p>
                    <p className="text-xs text-muted-foreground">Pay with mobile money.</p>
                  </div>
                </CardContent>
              </Card>
            </button>

            {paymentMethod === "momo" && (
              <div className="space-y-2">
                <Label htmlFor="momo-phone" className="text-sm font-medium">MoMo phone number</Label>
                <Input
                  id="momo-phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="e.g. 76123456"
                  value={momoPhone}
                  onChange={(e) => setMomoPhone(e.target.value)}
                  required
                  disabled={momoPending}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Enter the Eswatini number registered for MTN MoMo.</p>
              </div>
            )}

            {momoPending && (
              <Card className="border border-primary/40 bg-primary/5">
                <CardContent className="p-4 text-sm">
                  <p className="font-semibold">Check your phone</p>
                  <p className="text-muted-foreground">
                    Approve the MTN MoMo prompt to complete your payment. This page updates automatically.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          <Button
            type="submit"
            size="lg"
            disabled={loading || !email || !hasValidSelection || (paymentMethod === "momo" && (!momoPhone || momoPending))}
            className="h-12 w-full rounded-lg text-base font-semibold"
          >
            {paymentMethod === "momo"
              ? momoPending
                ? "Waiting for MoMo approval..."
                : loading
                  ? "Starting MoMo payment..."
                  : "Pay with MTN MoMo"
              : loading
                ? "Redirecting to Paystack..."
                : "Pay with Paystack"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {paymentMethod === "momo"
              ? "Your tickets will be issued once MTN MoMo confirms the payment."
              : "Your tickets will be issued after Paystack confirms successful payment."}
          </p>
        </form>
      </div>
    </div>
  )
}
