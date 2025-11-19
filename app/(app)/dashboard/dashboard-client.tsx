"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Ticket, DollarSign, Zap } from "lucide-react"

import { TicketCard } from "@/components/tickets/ticket-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { UserOrder } from "@/lib/orders"
import { formatCurrency } from "@/lib/pricing"

interface DashboardClientProps {
  orders: UserOrder[]
}

export default function DashboardClient({ orders }: DashboardClientProps) {
  const stats = useMemo(() => {
    const totalTickets = orders.reduce((sum, order) => sum + order.order_items.reduce((subtotal, item) => subtotal + item.quantity, 0), 0)
    const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0)
    const upcomingEvents = orders.filter((order) => {
      const start = order.event?.starts_at
      return start ? new Date(start) >= new Date() : true
    }).length

    return { totalTickets, totalSpent, upcomingEvents }
  }, [orders])

  const tickets = useMemo(() => {
    return orders.flatMap((order) =>
      order.order_items.map((item) => ({
        id: item.id,
        eventTitle: order.event?.title ?? "Event",
        ticketNumber: item.tickets?.[0]?.qr_code ?? item.id,
        quantity: item.quantity,
        total: item.total_amount,
        currency: item.currency,
        purchaseDate: order.created_at,
      })),
    )
  }, [orders])

  const currency = orders[0]?.currency ?? "USD"

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
        <p className="text-lg text-muted-foreground">Manage all your event tickets in one place</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Tickets</p>
                <p className="text-3xl font-bold">{stats.totalTickets}</p>
              </div>
              <Ticket className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                <p className="text-3xl font-bold">{formatCurrency(stats.totalSpent, currency)}</p>
              </div>
              <DollarSign className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Upcoming Events</p>
                <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
              </div>
              <Zap className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Tickets</h2>
        {tickets.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground text-lg mb-2">No tickets yet</p>
              <p className="text-muted-foreground text-sm mb-6">Start by browsing and booking your first event</p>
              <Link href="/browse">
                <Button>Browse Events</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
