"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingCart, Check, AlertCircle } from "lucide-react"
import { MOCK_EVENTS } from "@/lib/mock-data"

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const event = MOCK_EVENTS.find((e) => e.id === eventId)

  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const subtotal = (event?.price || 0) * quantity
  const fees = subtotal * 0.1
  const total = subtotal + fees

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!name.trim() || !email.trim()) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)

    try {
      // Simulate checkout
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Store ticket
      const tickets = JSON.parse(localStorage.getItem("ticketiv_tickets") || "[]")
      tickets.push({
        id: Math.random().toString(36).substr(2, 9),
        eventId,
        eventTitle: event?.title,
        quantity,
        total,
        purchaseDate: new Date().toISOString(),
        ticketNumber: `TICKET-${Date.now()}`,
      })
      localStorage.setItem("ticketiv_tickets", JSON.stringify(tickets))

      router.push("/dashboard")
    } catch (err) {
      setError("Checkout failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-muted-foreground">Event not found</p>
        <Button onClick={() => router.push("/browse")} className="mt-4">
          Back to Events
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
        <p className="text-muted-foreground">You're just a few steps away from securing your tickets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleCheckout} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Ticket Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Select Tickets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition">
                  <div>
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-muted-foreground">${event.price} per ticket</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-1 border rounded hover:bg-muted transition"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                      className="w-12 text-center border rounded"
                      min="1"
                      max="10"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(10, quantity + 1))}
                      className="px-3 py-1 border rounded hover:bg-muted transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendee Info */}
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Full Name *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email Address *</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup defaultValue="card">
                  <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/50 transition">
                    <RadioGroupItem value="card" id="card" />
                    <label htmlFor="card" className="cursor-pointer flex-1">
                      <p className="font-semibold">Credit Card</p>
                      <p className="text-sm text-muted-foreground">Visa, Mastercard, American Express</p>
                    </label>
                  </div>
                </RadioGroup>
                <div className="mt-4 p-4 bg-muted rounded-lg border">
                  <p className="text-sm font-medium mb-2">Demo Checkout</p>
                  <p className="text-xs text-muted-foreground">
                    This is a demonstration. No real payment processing occurs. Click "Complete Purchase" to finalize.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete Purchase
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-1">{event.title}</h4>
                <p className="text-sm text-muted-foreground">
                  {quantity} ticket{quantity !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-2 text-sm border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fees</span>
                  <span>${fees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                  <span>Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
