"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingCart, Check, AlertCircle } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase"

type EventSummary = {
  id: string
  title: string
  price: number
  tickets_available: number
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const supabase = useMemo(() => createClient(), [])

  const [event, setEvent] = useState<EventSummary | null>(null)
  const [eventLoading, setEventLoading] = useState(true)
  const [eventError, setEventError] = useState("")

  const [quantity, setQuantity] = useState(1)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let isMounted = true

    const fetchEvent = async () => {
      setEventLoading(true)
      setEventError("")

      const { data, error } = await supabase
        .from("events")
        .select("id, title, price, tickets_available")
        .eq("id", eventId)
        .single()

      if (!isMounted) return

      if (error) {
        setEvent(null)
        setEventError("Unable to load event details. Please try again later.")
      } else {
        setEvent({
          id: data.id,
          title: data.title,
          price: Number(data.price ?? 0),
          tickets_available: data.tickets_available ?? 0,
        })
        setQuantity(1)
      }

      setEventLoading(false)
    }

    if (eventId) {
      fetchEvent()
    }

    return () => {
      isMounted = false
    }
  }, [eventId, supabase])

  const maxQuantity = event ? Math.max(1, Math.min(10, event.tickets_available)) : 10
  const subtotal = (event?.price || 0) * quantity
  const fees = subtotal * 0.1
  const total = subtotal + fees

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!event) {
      setError("Event details are still loading. Please wait a moment and try again.")
      return
    }

    if (!name.trim() || !email.trim()) {
      setError("Please fill in all required fields")
      return
    }

    if (event.tickets_available < 1) {
      setError("This event is sold out.")
      return
    }

    if (quantity > maxQuantity) {
      setError("Not enough tickets available for the selected quantity.")
      return
    }

    setLoading(true)

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!userResult.user) {
        setError("You must be signed in to complete your purchase.")
        router.push("/login")
        return
      }

      const subtotalValue = event.price * quantity
      const feesValue = subtotalValue * 0.1
      const totalValue = Number((subtotalValue + feesValue).toFixed(2))

      const { error: insertError } = await supabase.from("tickets").insert({
        user_id: userResult.user.id,
        event_id: event.id,
        quantity,
        total: totalValue,
        ticket_number: `TICKET-${Date.now()}`,
        purchase_date: new Date().toISOString(),
      })

      if (insertError) {
        throw insertError
      }

      router.push("/dashboard")
    } catch (err) {
      console.error(err)
      setError("Checkout failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (eventLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Spinner className="h-8 w-8 animate-spin text-primary" viewBox="0 0 24 24" />
          <p className="text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {eventError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{eventError}</AlertDescription>
          </Alert>
        )}
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
            {eventError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{eventError}</AlertDescription>
              </Alert>
            )}
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
                    <p className="text-sm text-muted-foreground">${event.price.toFixed(2)} per ticket</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {event.tickets_available > 0
                        ? `${event.tickets_available} ticket${event.tickets_available !== 1 ? "s" : ""} remaining`
                        : "Sold out"}
                    </p>
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
                      onChange={(e) => {
                        const value = Number.parseInt(e.target.value)
                        if (Number.isNaN(value)) {
                          setQuantity(1)
                          return
                        }
                        setQuantity(Math.min(maxQuantity, Math.max(1, value)))
                      }}
                      className="w-12 text-center border rounded"
                      min="1"
                      max={maxQuantity}
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                      className="px-3 py-1 border rounded hover:bg-muted transition"
                      disabled={event.tickets_available <= 0}
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
