'use server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Mail, ArrowRight, Download, QrCode, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPublicEvents } from '@/lib/data/public/events'

interface SuccessPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ order_id?: string }>
}

export default async function SuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { id } = await params
  const { order_id } = await searchParams

  const events = await getPublicEvents()
  const event = events.find((e) => e.slug === id || e.id === id)

  if (!event) {
    notFound()
  }

  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Success Content */}
      <div className="flex-1 max-w-2xl mx-auto px-4 py-12 sm:py-16 flex flex-col items-center justify-center text-center space-y-8">
        {/* Success Icon */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
          <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-full p-6">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">Your ticket is ready!</h1>
          <p className="text-lg text-muted-foreground">
            Get ready for an amazing experience
          </p>
        </div>

        {/* Ticket Card with QR */}
        <div className="w-full max-w-md">
          <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6 space-y-4">
              {/* Ticket Header */}
              <div className="space-y-2">
                <Badge variant="secondary" className="w-fit">Your Ticket</Badge>
                <h3 className="font-bold text-lg">{event.ticket_types?.[0]?.name || 'General Admission'}</h3>
              </div>

              {/* QR Code Placeholder */}
              <div className="bg-white rounded-lg p-4 flex items-center justify-center aspect-square border-2 border-dashed border-primary/30">
                <div className="text-center space-y-2">
                  <div className="flex justify-center">
                    <QrCode className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">QR Code</p>
                  <p className="text-xs text-muted-foreground/60">Check email for scannable code</p>
                </div>
              </div>

              {/* Ticket Details */}
              <div className="space-y-2 text-sm border-t border-primary/10 pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono text-xs">{order_id?.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid:</span>
                  <span>{event.start_date
                    ? new Date(event.start_date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Event date'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-2"
              asChild
            >
              <button>
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </Button>
            <Button size="sm" className="flex-1" asChild>
              <Link href={`/events/${event.id}/ticket${order_id ? `?order_id=${order_id}` : ''}`}>
                View Details
              </Link>
            </Button>
          </div>
        </div>

        {/* Email Confirmation */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Mail className="h-5 w-5 text-primary" />
          <span>We've emailed your ticket to your address</span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
          <Button size="lg" className="flex-1 h-12 rounded-lg" asChild>
            <Link href="/app/tickets">
              View My Tickets
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-12 rounded-lg"
            asChild
          >
            <Link href="/browse">Browse Events</Link>
          </Button>
        </div>

        {/* Additional Info */}
        <div className="space-y-2 text-xs text-muted-foreground pt-4">
          <p>✓ Check your email for your ticket</p>
          <p>✓ You can access your ticket anytime on this device</p>
          <p>✓ No account needed - just save your email</p>
        </div>

        {/* Host CTA */}
        <Card className="w-full max-w-md bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">Hosting an event?</p>
              <p className="text-xs text-muted-foreground mt-1">Start selling tickets in minutes with Ticketiv</p>
              <Button size="sm" variant="link" className="px-0 mt-2 h-auto" asChild>
                <Link href="/create">Get Started →</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
