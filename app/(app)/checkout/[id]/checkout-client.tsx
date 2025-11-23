"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"

import { QuantitySelector } from "@/components/forms/quantity-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-muted-foreground">Simple ticket selection and attendee details—nothing extra.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <form onSubmit={handleCheckout} className="space-y-6 lg:col-span-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Select tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {event.ticket_types.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketTypeId(ticket.id)}
                    className={`flex w-full items-start justify-between gap-4 rounded-lg border p-4 text-left transition ${
                      selectedTicketTypeId === ticket.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold">{ticket.name}</p>
                      {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{formatCurrency(ticket.price, ticket.currency)}</p>
                      <p className="text-xs text-muted-foreground">{ticket.quantity_remaining} left</p>
                    </div>
                  </button>
                ))}
              </div>
              <QuantitySelector quantity={quantity} onChange={setQuantity} max={selectedTicketType?.quantity_remaining ?? undefined} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendee details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">First name *</label>
                  <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="John" required />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Last name *</label>
                  <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Doe" required />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Email address *</label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
              </div>
              <p className="text-xs text-muted-foreground">We only collect what we need to send your tickets.</p>
            </CardContent>
          </Card>

          <Button type="submit" className="h-12 w-full text-base" disabled={loading}>
            {loading ? "Processing..." : "Complete purchase"}
          </Button>
        </form>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <h4 className="font-semibold">{event.title}</h4>
                <p className="text-muted-foreground">{quantity} ticket{quantity !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(pricing.subtotal, pricing.currency)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Fees</span>
                <span>{formatCurrency(pricing.fees, pricing.currency)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(pricing.total, pricing.currency)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demo checkout</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Payments are mocked for this preview. Submit the form to generate tickets without entering card details.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
