"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Ticket, DollarSign, Zap } from "lucide-react"

import { TicketCard } from "@/components/tickets/ticket-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem("ticketiv_tickets")
    setTickets(stored ? JSON.parse(stored) : [])
  }, [])

  if (!mounted) return null

  const totalSpent = tickets.reduce((sum: number, t: any) => sum + t.total, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
        <p className="text-lg text-muted-foreground">Manage all your event tickets in one place</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Tickets</p>
                <p className="text-3xl font-bold">{tickets.length}</p>
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
                <p className="text-3xl font-bold">${totalSpent.toFixed(2)}</p>
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
                <p className="text-3xl font-bold">{tickets.length}</p>
              </div>
              <Zap className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
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
            {tickets.map((ticket: any) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
