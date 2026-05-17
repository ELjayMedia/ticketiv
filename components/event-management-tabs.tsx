'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, CreditCard, Eye, FileText, ListMusic, QrCode, Users } from 'lucide-react'
import Link from 'next/link'
import { LineupStep } from '@/components/event-wizard/steps/LineupStep'
import { PoliciesStep } from '@/components/event-wizard/steps/PoliciesStep'
import { FinishSetupNudge } from '@/components/event-management/finish-setup-nudge'

interface EventManagementTabsProps {
  eventId: string
  orgId: string
  event: {
    id: string
    title: string
    date: string
    status: string
  }
}

export function EventManagementTabs({ eventId, orgId, event }: EventManagementTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'overview'

  const dismissKey = `ticketiv:event-setup-dismissed:${eventId}`
  const [nudgeDismissed, setNudgeDismissed] = useState(true)

  useEffect(() => {
    setNudgeDismissed(window.localStorage.getItem(dismissKey) === '1')
  }, [dismissKey])

  const dismissNudge = useCallback(() => {
    window.localStorage.setItem(dismissKey, '1')
    setNudgeDismissed(true)
  }, [dismissKey])

  function changeTab(next: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'overview') params.delete('tab')
    else params.set('tab', next)
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <Tabs value={tab} onValueChange={changeTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7">
        <TabsTrigger value="overview" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="checkin" className="gap-2">
          <QrCode className="h-4 w-4" />
          <span className="hidden sm:inline">Check-in</span>
        </TabsTrigger>
        <TabsTrigger value="tickets" className="gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Tickets</span>
        </TabsTrigger>
        <TabsTrigger value="lineup" className="gap-2">
          <ListMusic className="h-4 w-4" />
          <span className="hidden sm:inline">Lineup</span>
        </TabsTrigger>
        <TabsTrigger value="policies" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Policies</span>
        </TabsTrigger>
        <TabsTrigger value="staff" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Staff</span>
        </TabsTrigger>
        <TabsTrigger value="payouts" className="gap-2">
          <CreditCard className="h-4 w-4" />
          <span className="hidden sm:inline">Payouts</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-6 mt-6">
        <FinishSetupNudge eventId={eventId} dismissed={nudgeDismissed} onDismiss={dismissNudge} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Event Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={event.status === 'published' ? 'default' : 'secondary'} className="capitalize">
                {event.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Event Date</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{event.date}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">0</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>Manage your event information and visibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground mb-2">{event.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">Event created on {new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link href={`/orgs/${orgId}/events/${eventId}/edit`}>Edit Event</Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/browse/events/${eventId}`}>
                  <Eye className="h-4 w-4" />
                  View Public Page
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Check-in Tab */}
      <TabsContent value="checkin" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scan & Check-in
            </CardTitle>
            <CardDescription>Start checking in attendees using QR code scanner</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg" className="w-full gap-2">
              <Link href={`/orgs/${orgId}/events/${eventId}/checkin`}>
                <QrCode className="h-5 w-5" />
                Open Scanner
              </Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tickets Tab */}
      <TabsContent value="tickets" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Ticket Types</CardTitle>
            <CardDescription>Manage ticket types and availability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>No ticket types configured yet</p>
              <Button asChild className="mt-4">
                <Link href={`/orgs/${orgId}/events/${eventId}/edit?step=tickets`}>Add Tickets</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Lineup Tab */}
      <TabsContent value="lineup" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Lineup</CardTitle>
            <CardDescription>Add performers, speakers and featured guests for this event</CardDescription>
          </CardHeader>
          <CardContent>
            <LineupStep eventId={eventId} onSaving={dismissNudge} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Policies Tab */}
      <TabsContent value="policies" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>Refund policy, attendee fields and confirmation messaging</CardDescription>
          </CardHeader>
          <CardContent>
            <PoliciesStep eventId={eventId} onSaving={dismissNudge} />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Staff Tab */}
      <TabsContent value="staff" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Event Staff
            </CardTitle>
            <CardDescription>Manage scanners and event staff who can check in attendees</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="gap-2">
              <Link href={`/orgs/${orgId}/events/${eventId}/staff`}>
                <Users className="h-4 w-4" />
                Manage staff
              </Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Payouts Tab */}
      <TabsContent value="payouts" className="space-y-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$0.00</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$0.00</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid Out</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">$0.00</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Request and track your payouts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <p>No payouts yet</p>
              <Button disabled className="mt-4">
                Request Payout
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
