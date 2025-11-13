"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ShoppingCart, Check, AlertCircle } from "lucide-react"

import { QuantitySelector } from "@/components/forms/quantity-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { calculatePricing, formatCurrency } from "@/lib/pricing"
import { MOCK_EVENTS } from "@/lib/mock-data"

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const event = MOCK_EVENTS.find((item) => item.id === eventId)

  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const pricing = useMemo(() => calculatePricing({ eventId, quantity }), [eventId, quantity])

  const handleCheckout = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")

    if (!name.trim() || !email.trim()) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          quantity,
          attendeeName: name,
          attendeeEmail: email,
        }),
      })

      if (!response.ok) {
        throw new Error("Unable to create order")
      }

      const order = await response.json()

      const tickets = JSON.parse(localStorage.getItem("ticketiv_tickets") || "[]")
      tickets.push({
        id: order.id,
        eventId,
        eventTitle: event?.title,
        quantity: order.quantity,
        total: order.pricing.total,
        purchaseDate: order.createdAt,
        ticketNumber: order.tickets[0]?.code || `TICKET-${Date.now()}`,
      })
      localStorage.setItem("ticketiv_tickets", JSON.stringify(tickets))

      router.push("/dashboard")
    } catch (error) {
      console.error(error)
      setError("Checkout failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-muted-foreground">Event not found</p>
        <Button onClick={() => router.push("/browse")} className="mt-4">
          Back to Events
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Complete Your Purchase</h1>
        <p className="text-muted-foreground">You're just a few steps away from securing your tickets</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form onSubmit={handleCheckout} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Select Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition hover:bg-accent/50">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{formatCurrency(event.price)} per ticket</p>
                  </div>
                  <QuantitySelector quantity={quantity} onChange={setQuantity} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium">Full Name *</label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email Address *</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup defaultValue="card">
                  <div className="flex items-center space-x-3 rounded-lg border p-4 transition hover:bg-accent/50">
                    <RadioGroupItem value="card" id="card" />
                    <label htmlFor="card" className="flex-1 cursor-pointer">
                      <p className="font-semibold">Credit Card</p>
                      <p className="text-sm text-muted-foreground">Visa, Mastercard, American Express</p>
                    </label>
                  </div>
                </RadioGroup>
                <div className="mt-4 rounded-lg border bg-muted p-4">
                  <p className="mb-2 text-sm font-medium">Demo Checkout</p>
                  <p className="text-xs text-muted-foreground">
                    This is a demonstration. No real payment processing occurs. Click "Complete Purchase" to finalize.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
              {loading ? (
                <>
                  <span className="mr-2 animate-spin">⟳</span>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Complete Purchase
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold">{event.title}</h4>
                <p className="text-muted-foreground">
                  {quantity} ticket{quantity !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees</span>
                  <span>{formatCurrency(pricing.fees)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-primary">{formatCurrency(pricing.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Secure Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>✓ SSL encrypted payment processing</p>
              <p>✓ Instant ticket delivery via email</p>
              <p>✓ 24/7 customer support for attendees</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
