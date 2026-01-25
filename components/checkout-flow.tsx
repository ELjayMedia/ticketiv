"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/pricing"

export type CheckoutStep = "select" | "promo" | "review" | "payment" | "success"

export interface CheckoutTicket {
  id: string
  name: string
  price_cents: number
  quantity: number
  per_user_limit?: number
  available: number
}

export interface CheckoutState {
  step: CheckoutStep
  tickets: Record<string, number>
  promoCode?: string
  total_cents: number
  fees_cents: number
}

interface CheckoutFlowProps {
  eventTitle: string
  eventSlug: string
  ticketTypes: CheckoutTicket[]
  onSubmitCheckout: (state: CheckoutState) => Promise<{ url?: string; error?: string }>
  currency?: string
}

export function CheckoutFlow({
  eventTitle,
  eventSlug,
  ticketTypes,
  onSubmitCheckout,
  currency = "USD",
}: CheckoutFlowProps) {
  const [state, setState] = useState<CheckoutState>({
    step: "select",
    tickets: {},
    total_cents: 0,
    fees_cents: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const selectedTickets = ticketTypes.filter((t) => (state.tickets[t.id] || 0) > 0)
  const hasSelection = selectedTickets.length > 0

  const updateQuantity = (ticketId: string, delta: number) => {
    const ticket = ticketTypes.find((t) => t.id === ticketId)
    if (!ticket) return

    const current = state.tickets[ticketId] || 0
    const newQty = Math.max(0, Math.min(current + delta, ticket.available, ticket.per_user_limit || 99))

    setState((prev) => ({
      ...prev,
      tickets: { ...prev.tickets, [ticketId]: newQty },
    }))
  }

  const calculateTotals = () => {
    let subtotal = 0
    selectedTickets.forEach((ticket) => {
      subtotal += ticket.price_cents * (state.tickets[ticket.id] || 0)
    })

    // In production: use fn_preview_pricing RPC to compute fees
    const fees = Math.round(subtotal * 0.1) // 10% placeholder
    return { subtotal, fees, total: subtotal + fees }
  }

  const { subtotal, fees, total } = calculateTotals()

  const handleCheckout = async () => {
    if (!hasSelection) return

    setIsSubmitting(true)
    setError("")

    try {
      // In production: use fn_quote_order RPC before redirecting
      const result = await onSubmitCheckout({
        step: "payment",
        tickets: state.tickets,
        total_cents: total,
        fees_cents: fees,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.url) {
        window.location.href = result.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Steps */}
      <div className="flex gap-2 overflow-x-auto">
        {["select", "promo", "review", "payment"].map((step, idx) => (
          <div key={step} className="flex items-center">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold",
                state.step === step
                  ? "bg-primary text-primary-foreground"
                  : idx < ["select", "promo", "review", "payment"].indexOf(state.step)
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {idx + 1}
            </div>
            {idx < 3 && <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Select Tickets */}
      {state.step === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Tickets</CardTitle>
            <CardDescription>{eventTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticketTypes.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-semibold">{ticket.name}</div>
                  <div className="text-sm text-muted-foreground">{formatCurrency(ticket.price_cents, currency)}</div>
                  {ticket.available < 10 && (
                    <Badge variant="secondary" className="mt-1">
                      Only {ticket.available} left
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(ticket.id, -1)}
                    disabled={(state.tickets[ticket.id] || 0) === 0}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center font-semibold">{state.tickets[ticket.id] || 0}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateQuantity(ticket.id, 1)}
                    disabled={(state.tickets[ticket.id] || 0) >= ticket.available}
                  >
                    +
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={() => setState((prev) => ({ ...prev, step: "promo" }))}
              disabled={!hasSelection}
              className="w-full"
            >
              Continue to Promo <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Promo Code */}
      {state.step === "promo" && (
        <Card>
          <CardHeader>
            <CardTitle>Promo Code</CardTitle>
            <CardDescription>Enter a promo code if you have one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="SUMMER20"
              value={state.promoCode || ""}
              onChange={(e) => setState((prev) => ({ ...prev, promoCode: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setState((prev) => ({ ...prev, step: "select" }))}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setState((prev) => ({ ...prev, step: "review" }))}
                className="flex-1"
              >
                Continue <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review */}
      {state.step === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Order Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              {selectedTickets.map((ticket) => (
                <div key={ticket.id} className="flex justify-between text-sm">
                  <span>
                    {ticket.name} × {state.tickets[ticket.id]}
                  </span>
                  <span>{formatCurrency(ticket.price_cents * (state.tickets[ticket.id] || 0), currency)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fees</span>
                <span>{formatCurrency(fees, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total, currency)}</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">{error}</div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setState((prev) => ({ ...prev, step: "promo" }))}
                className="flex-1"
              >
                Back
              </Button>
              <Button onClick={handleCheckout} disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isSubmitting ? "Processing..." : "Continue to Payment"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
