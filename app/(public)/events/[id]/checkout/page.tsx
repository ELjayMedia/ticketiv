'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CheckoutPageProps {
  params: { id: string }
  searchParams: { ticket_type_id?: string; quantity?: string }
}

export default function CheckoutPage({
  params,
  searchParams,
}: CheckoutPageProps) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [quantity, setQuantity] = useState(parseInt(searchParams.quantity || '1'))
  const [loading, setLoading] = useState(false)

  // Dummy event data for demo
  const event = {
    id: params.id,
    title: 'Tech Conference 2026',
    date: 'Mar 15, 2026',
    location: 'San Francisco, CA',
    ticketPrice: 129,
  }

  const total = event.ticketPrice * quantity

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      alert('Please enter your email')
      return
    }
    setLoading(true)
    // Simulate checkout
    setTimeout(() => {
      window.location.href = `/events/${event.id}/success`
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-4">
        <Link
          href={`/events/${event.id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{event.date} • {event.location}</p>
                  </div>
                  <Badge variant="outline">{quantity} ticket{quantity > 1 ? 's' : ''}</Badge>
                </div>
                <div className="border-t border-border/40 pt-3 flex justify-between">
                  <span className="font-medium">${event.ticketPrice} × {quantity}</span>
                  <span className="font-bold text-primary text-lg">${total}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <form onSubmit={handleCheckout} className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Your Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Email Address *</label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-10"
                        required
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Your ticket will be sent here</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Phone Number (Optional)</label>
                    <div className="relative mt-2">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Payment Method</h2>
                <div className="space-y-2">
                  {['DeltaPay', 'Card', 'Paystack', 'Flutterwave'].map((method) => (
                    <label key={method} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 cursor-pointer transition">
                      <input
                        type="radio"
                        name="payment"
                        defaultChecked={method === 'DeltaPay'}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium">{method}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trust & Security */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-3 rounded-lg bg-muted/30 border border-border/40">
              <CreditCard className="h-4 w-4" />
              <span>Secure payment processing • Your data is encrypted</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading || !email}
              size="lg"
              className="w-full h-12 font-semibold rounded-lg"
            >
              {loading ? 'Processing...' : `Pay & Get Ticket ($${total})`}
            </Button>

            {/* Footer Note */}
            <p className="text-xs text-muted-foreground text-center">
              By clicking "Pay & Get Ticket", you agree to our terms and conditions
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
