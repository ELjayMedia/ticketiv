'use server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Download, Share2, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getPublicEvents } from '@/lib/data/public/events'

interface TicketPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ order_id?: string }>
}

export default async function TicketPage({
  params,
  searchParams,
}: TicketPageProps) {
  const { id } = await params
  const { order_id } = await searchParams

  const events = await getPublicEvents()
  const event = events.find((e) => e.slug === id || e.id === id)

  if (!event) {
    notFound()
  }

  // In a real app, you'd fetch actual ticket data with the order_id
  const ticketId = 'TIX-' + (order_id || Date.now().toString()).slice(-8).toUpperCase()
  const ticketStatus = 'VALID'

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="border-b border-border/40 bg-background sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/events/${event.id}`}
            className="inline-flex p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-lg">My Ticket</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Ticket Card - Designed for screenshotting */}
        <Card className="border-0 bg-gradient-to-br from-primary/10 via-accent/5 to-background overflow-hidden">
          <CardContent className="p-0">
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-90">
                Event Ticket
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                {event.title}
              </h2>
            </div>

            {/* Ticket Body */}
            <div className="p-6 space-y-6">
              {/* Event Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Date & Time
                  </p>
                  <p className="font-semibold">
                    {event.start_date
                      ? new Date(event.start_date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'TBA'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.start_date
                      ? new Date(event.start_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Venue
                  </p>
                  <p className="font-semibold text-sm">
                    {event.location || event.venue?.name || 'TBA'}
                  </p>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center py-8 bg-white rounded-lg border-2 border-primary/20">
                <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-primary">
                  {/* In production, generate QR code with qr-code library */}
                  <div className="text-center">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      QR Code
                    </p>
                    <div className="w-40 h-40 bg-gradient-to-br from-primary/20 to-accent/20 rounded flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">{ticketId}</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Show this at the venue for entry
                </p>
              </div>

              {/* Ticket Details */}
              <div className="space-y-3 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ticket ID</span>
                  <span className="font-mono font-semibold text-sm">{ticketId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ticket Type</span>
                  <span className="font-semibold text-sm">
                    {event.ticket_types?.[0]?.name || 'General Admission'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/10">
                      {ticketStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Footer */}
            <div className="bg-muted/30 px-6 py-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground text-center">
                This ticket is valid for entry. No refunds after event start.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="border-0 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500">
          <CardContent className="p-4 flex gap-3">
            <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm mb-1">Arrive Early</p>
              <p className="text-xs text-muted-foreground">
                Please arrive at least 15 minutes before the event start time.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-11 rounded-lg gap-2"
            onClick={() => window.print()}
          >
            <Download className="h-4 w-4" />
            Save Ticket
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="flex-1 h-11 rounded-lg gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-center text-muted-foreground">
          Your ticket is stored on this device and in your email. You don't need an account.
        </p>
      </div>
    </div>
  )
}
