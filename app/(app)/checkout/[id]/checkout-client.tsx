"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Check, AlertCircle } from "lucide-react"

import { QuantitySelector } from "@/components/forms/quantity-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { calculateOrderPricing, formatCurrency } from "@/lib/pricing"
import type { EventDetail } from "@/types"

interface CheckoutClientProps {
  event: EventDetail
}

export default function CheckoutClient({ event }: CheckoutClientProps) {
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>(event.ticket_types[0]?.id ?? "")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const selectedTicketType = useMemo(() => event.ticket_types.find((ticket) => ticket.id === selectedTicketTypeId), [event.ticket_types, selectedTicketTypeId])

  const pricing = useMemo(() => {
    if (!selectedTicketType) {
      return calculateOrderPricing({ items: [] })
    }
    return calculateOrderPricing({ items: [{ ticketType: selectedTicketType, quantity }] })
  }, [selectedTicketType, quantity])

  const handleCheckout = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault()
    setError("")

    if (!selectedTicketType) {
      setError("Please select a ticket type")
      return
    }

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
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
          eventId: event.id,
          items: [{ ticketTypeId: selectedTicketType.id, quantity }],
          firstName,
          lastName,
          email,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? "Unable to create order")
      }

      router.push("/dashboard")
    } catch (submitError: any) {
      console.error(submitError)
      setError(submitError.message ?? "Checkout failed. Please try again.")
    } finally {
      setLoading(false)
    }
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
                <RadioGroup value={selectedTicketTypeId} onValueChange={setSelectedTicketTypeId}>
                  {event.ticket_types.map((ticket) => (
                    <label key={ticket.id} className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 transition hover:bg-accent/50 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={ticket.id} id={ticket.id} />
                        <div>
                          <p className="font-semibold">{ticket.name}</p>
                          {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-semibold">{formatCurrency(ticket.price, ticket.currency)}</p>
                        <p className="text-xs text-muted-foreground">{ticket.quantity_remaining} left</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
                <QuantitySelector quantity={quantity} onChange={setQuantity} max={selectedTicketType?.quantity_remaining ?? undefined} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium">First Name *</label>
                    <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="John" required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Last Name *</label>
                    <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Doe" required />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email Address *</label>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
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
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(pricing.subtotal, pricing.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fees</span>
                <span>{formatCurrency(pricing.fees, pricing.currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrency(pricing.total, pricing.currency)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Why Ticketiv?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">Secure checkout, instant ticket delivery, and trusted by thousands of organizers.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
