'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, Users, CreditCard, Eye, QrCode } from 'lucide-react'
import Link from 'next/link'

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
  const [staffEmail, setStaffEmail] = useState('')

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
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

      {/* Staff Tab */}
      <TabsContent value="staff" className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Event Staff</CardTitle>
            <CardDescription>Invite team members to help manage this event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter staff email address"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
              />
              <Button disabled={!staffEmail.trim()}>
                Invite
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>No staff members invited yet</p>
            </div>
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
