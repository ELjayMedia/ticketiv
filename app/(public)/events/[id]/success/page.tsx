'use client'

import Link from 'next/link'
import { CheckCircle2, Download, Share2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface SuccessPageProps {
  params: { id: string }
}

export default function SuccessPage({ params }: SuccessPageProps) {
  const event = {
    id: params.id,
    title: 'Tech Conference 2026',
    date: 'Mar 15, 2026',
    location: 'San Francisco, CA',
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-br from-primary/20 to-accent/20 rounded-full p-6">
              <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Your Ticket is Ready!</h1>
          <p className="text-muted-foreground">We've sent your ticket to your email</p>
        </div>

        {/* Event Summary Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 space-y-3">
            <div className="text-left space-y-1">
              <h2 className="font-bold text-lg text-foreground">{event.title}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{event.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{event.location}</p>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            <strong>Pro Tip:</strong> Screenshot your ticket for offline access at the venue
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3 pt-4">
          <Button
            size="lg"
            className="w-full h-12 font-semibold rounded-lg"
            asChild
          >
            <Link href={`/events/${event.id}/ticket`}>
              View My Ticket
            </Link>
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full h-12 font-semibold rounded-lg gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share with Friends
          </Button>

          <Button
            variant="ghost"
            size="lg"
            className="w-full h-12 font-semibold rounded-lg"
            asChild
          >
            <Link href="/browse">
              Browse More Events
            </Link>
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-muted-foreground">
          Check your email for your ticket. If you don't see it, check your spam folder.
        </p>
      </div>
    </div>
  )
}
