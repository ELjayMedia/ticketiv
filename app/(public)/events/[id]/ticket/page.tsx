'use client'

import Link from 'next/link'
import { ArrowLeft, Download, QrCode, Share2, MapPin, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TicketPageProps {
  params: { id: string }
}

export default function TicketPage({ params }: TicketPageProps) {
  const ticket = {
    id: 'TKT-2026-001234',
    eventId: params.id,
    eventTitle: 'Tech Conference 2026',
    date: 'Mar 15, 2026',
    time: '09:00 AM',
    venue: 'Moscone Center',
    location: 'San Francisco, CA',
    ticketType: 'General Admission',
    quantity: 1,
    status: 'VALID',
    qrCode: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"%3E%3Crect fill="white" width="200" height="200"/%3E%3Crect x="20" y="20" width="30" height="30" fill="black"/%3E%3Crect x="120" y="20" width="30" height="30" fill="black"/%3E%3Crect x="20" y="120" width="30" height="30" fill="black"/%3E%3C/svg%3E',
  }

  const handleDownload = () => {
    alert('Download functionality would save ticket as PDF')
  }

  const handleShare = () => {
    alert('Share functionality would open share menu')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 px-4 py-4 flex justify-between items-center">
        <Link
          href={`/events/${ticket.eventId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload}>
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Ticket Card */}
          <Card className="overflow-hidden border-2 border-primary/20">
            <CardContent className="p-0">
              {/* Ticket Header */}
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-6 space-y-2 border-b border-border/40">
                <h1 className="text-2xl font-bold text-foreground">{ticket.eventTitle}</h1>
                <Badge className="w-fit" variant={ticket.status === 'VALID' ? 'default' : 'destructive'}>
                  {ticket.status}
                </Badge>
              </div>

              {/* Ticket Details */}
              <div className="p-6 space-y-4">
                {/* Event Info */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Date & Time</p>
                      <p className="font-semibold text-foreground">{ticket.date} • {ticket.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Venue</p>
                      <p className="font-semibold text-foreground">{ticket.venue}</p>
                      <p className="text-xs text-muted-foreground">{ticket.location}</p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t-2 border-dashed border-border/40 my-4" />

                {/* Ticket Info */}
                <div className="grid grid-cols-2 gap-4 text-center py-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Ticket Type</p>
                    <p className="font-semibold text-foreground text-sm">{ticket.ticketType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                    <p className="font-semibold text-foreground text-sm">× {ticket.quantity}</p>
                  </div>
                </div>

                {/* Ticket ID */}
                <div className="text-center py-2 bg-muted/30 rounded px-3">
                  <p className="text-xs text-muted-foreground mb-1">Ticket ID</p>
                  <p className="font-mono font-semibold text-xs text-foreground">{ticket.id}</p>
                </div>
              </div>

              {/* QR Code */}
              <div className="border-t border-border/40 p-6 flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Show this QR code at entry</p>
                  <p className="text-xs text-muted-foreground">Scan at the gate to check in</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
                  <QrCode className="h-32 w-32 text-primary" />
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border/40 p-6 text-center space-y-2 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <strong>Keep this ticket safe.</strong> You'll need it to enter the event.
                </p>
                <p className="text-xs text-muted-foreground">
                  Screenshot or download for offline access
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button
              size="lg"
              className="w-full h-12 font-semibold rounded-lg gap-2"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
              Download Ticket
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 font-semibold rounded-lg gap-2"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
              Share Ticket
            </Button>
          </div>

          {/* Footer Note */}
          <div className="text-center text-xs text-muted-foreground p-4 bg-muted/20 rounded-lg">
            <p>Need help? Contact <strong>support@ticketiv.com</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}
