"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Ticket, Calendar, DollarSign, Zap, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase"

type DashboardTicket = {
  id: string
  eventTitle: string
  quantity: number
  total: number
  purchaseDate: string
  ticketNumber: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [tickets, setTickets] = useState<DashboardTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadTickets = async () => {
      setLoading(true)
      setError(null)

      const { data: userResult, error: userError } = await supabase.auth.getUser()

      if (!isMounted) return

      if (userError) {
        console.error(userError)
        setError("Unable to verify your session. Please refresh and try again.")
        setTickets([])
        setLoading(false)
        return
      }

      if (!userResult.user) {
        setError("You must be signed in to view your tickets.")
        setTickets([])
        setLoading(false)
        router.push("/login")
        return
      }

      const { data, error: ticketsError } = await supabase
        .from("tickets")
        .select("id, event_id, quantity, total, ticket_number, purchase_date, events(title)")
        .eq("user_id", userResult.user.id)
        .order("purchase_date", { ascending: false })

      if (!isMounted) return

      if (ticketsError) {
        console.error(ticketsError)
        setError("Failed to load your tickets. Please try again later.")
        setTickets([])
      } else {
        const mappedTickets: DashboardTicket[] = (data ?? []).map((ticket) => ({
          id: ticket.id,
          eventTitle: ticket.events?.title ?? "Event",
          quantity: ticket.quantity ?? 0,
          total: Number(ticket.total ?? 0),
          purchaseDate: ticket.purchase_date ?? new Date().toISOString(),
          ticketNumber: ticket.ticket_number,
        }))

        setTickets(mappedTickets)
      }

      setLoading(false)
    }

    loadTickets()

    return () => {
      isMounted = false
    }
  }, [router, supabase])

  const totalSpent = tickets.reduce((sum, t) => sum + t.total, 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
        <p className="text-lg text-muted-foreground">Manage all your event tickets in one place</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Tickets</p>
                <p className="text-3xl font-bold">{loading ? "--" : tickets.length}</p>
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
                <p className="text-3xl font-bold">{loading ? "--" : `$${totalSpent.toFixed(2)}`}</p>
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
                <p className="text-3xl font-bold">{loading ? "--" : tickets.length}</p>
              </div>
              <Zap className="w-10 h-10 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Tickets</h2>
        {loading ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center flex flex-col items-center gap-4">
              <Spinner className="h-8 w-8 animate-spin text-primary" viewBox="0 0 24 24" />
              <p className="text-muted-foreground">Loading your tickets...</p>
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-2 mb-1">{ticket.eventTitle}</CardTitle>
                      <CardDescription className="text-xs">{ticket.ticketNumber}</CardDescription>
                    </div>
                    <Badge className="bg-primary shrink-0">x{ticket.quantity}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{new Date(ticket.purchaseDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t">
                    <span className="text-sm text-muted-foreground">Total Paid</span>
                    <span className="font-bold text-primary text-lg">${ticket.total.toFixed(2)}</span>
                  </div>
                  <Button variant="outline" className="w-full mt-2 bg-transparent">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
