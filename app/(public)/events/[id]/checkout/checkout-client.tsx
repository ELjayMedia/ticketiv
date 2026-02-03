'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { formatCurrency } from '@/lib/pricing'
import type { EventSummary } from '@/types'

interface CheckoutClientProps {
  event: EventSummary
  selectedTicketType?: EventSummary['ticket_types'][0]
}

const PAYMENT_METHODS = [
  { id: 'deltapay', name: 'DeltaPay', icon: '💳' },
  { id: 'card', name: 'Card', icon: '💳' },
  { id: 'paystack', name: 'Paystack', icon: '🔐' },
  { id: 'flutterwave', name: 'Flutterwave', icon: '🌊' },
]

export function CheckoutClient({
  event,
  selectedTicketType,
}: CheckoutClientProps) {
  const [quantity, setQuantity] = useState(1)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('deltapay')
  const [loading, setLoading] = useState(false)

  const ticket = selectedTicketType || event.ticket_types?.[0]
  if (!ticket) return null

  const subtotal = ticket.price * quantity
  const fee = Math.round(subtotal * 0.02 * 100) / 100
  const total = subtotal + fee

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/payments/deltapay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          ticketTypeId: ticket.id,
          quantity,
          email,
          phone,
          amount: total,
          paymentMethod,
        }),
      })

      if (!response.ok) throw new Error('Checkout failed')
      const data = await response.json()
      window.location.href = data.redirectUrl || `/events/${event.id}/success`
    } catch (error) {
      console.error('Checkout error:', error)
      setLoading(false)
    }
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-lg">Checkout</h1>
            <p className="text-xs text-muted-foreground">{event.title}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Ticket Summary */}
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Order Summary</h2>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{ticket.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(ticket.price, event.currency)} × {quantity}
                  </p>
                </div>
                <p className="font-semibold">{formatCurrency(subtotal, event.currency)}</p>
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Processing fee</span>
                <span>{formatCurrency(fee, event.currency)}</span>
              </div>

              <div className="pt-3 border-t border-border/40 flex justify-between items-center font-bold">
                <span>Total</span>
                <span className="text-primary text-lg">
                  {formatCurrency(total, event.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quantity Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quantity</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                −
              </Button>
              <input
                type="number"
                min="1"
                max={ticket.quantity_remaining}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 text-center border border-border rounded-md"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setQuantity(Math.min(ticket.quantity_remaining || 10, quantity + 1))
                }
              >
                +
              </Button>
              <span className="text-xs text-muted-foreground ml-auto">
                {ticket.quantity_remaining} available
              </span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <form onSubmit={handleCheckout} className="space-y-6">
          <div className="space-y-4">
            <h2 className="font-bold text-lg">Contact Information</h2>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number (Optional)
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg">Payment Method</h2>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.id}
                    className="relative cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={paymentMethod === method.id}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="sr-only"
                    />
                    <Card className={`border-2 transition-all ${
                      paymentMethod === method.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border/40 hover:border-primary/50'
                    }`}>
                      <CardContent className="p-4 text-center space-y-2">
                        <span className="text-2xl">{method.icon}</span>
                        <p className="text-xs font-medium">{method.name}</p>
                      </CardContent>
                    </Card>
                  </label>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* CTA */}
          <Button
            type="submit"
            size="lg"
            disabled={loading || !email}
            className="w-full h-12 text-base font-semibold rounded-lg"
          >
            {loading ? 'Processing...' : 'Pay & Get Ticket'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By purchasing, you agree to our terms. Your ticket will be emailed immediately.
          </p>
        </form>
      </div>
    </div>
  )
}
