'use server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle, Mail, ArrowRight } from 'hugeicons-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold">Your ticket is ready!</h1>
          <p className="text-lg text-muted-foreground">
            Get ready for an amazing experience
          </p>
        </div>

        {/* Event Summary Card */}
        <Card className="w-full border-0 bg-muted/50">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Event
              </p>
              <h2 className="text-xl font-bold">{event.title}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="font-semibold text-sm">
                  {event.start_date
                    ? new Date(event.start_date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'TBA'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Venue</p>
                <p className="font-semibold text-sm">
                  {event.location || event.venue?.name || 'TBA'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Confirmation */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Mail className="h-5 w-5 text-primary" />
          <span>We've emailed your ticket to your address</span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button size="lg" className="flex-1 h-12 rounded-lg" asChild>
            <Link href={`/events/${event.id}/ticket${order_id ? `?order_id=${order_id}` : ''}`}>
              View My Ticket
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-12 rounded-lg"
            asChild
          >
            <Link href="/browse">Browse More Events</Link>
          </Button>
        </div>

        {/* Additional Info */}
        <div className="space-y-2 text-xs text-muted-foreground pt-4">
          <p>✓ Check your email for your ticket</p>
          <p>✓ You can access your ticket anytime on this device</p>
          <p>✓ No account needed - just save your email</p>
        </div>
      </div>
    </div>
  )
}
