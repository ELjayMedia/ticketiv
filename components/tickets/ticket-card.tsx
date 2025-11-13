import { Calendar, Ticket as TicketIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface TicketCardProps {
  ticket: {
    id: string
    eventTitle: string
    ticketNumber: string
    quantity: number
    total: number
    purchaseDate: string
  }
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Card key={ticket.id} className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="mb-1 line-clamp-2">{ticket.eventTitle}</CardTitle>
            <CardDescription className="text-xs">{ticket.ticketNumber}</CardDescription>
          </div>
          <Badge className="bg-primary">x{ticket.quantity}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{new Date(ticket.purchaseDate).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <TicketIcon className="h-4 w-4 text-muted-foreground" />
          <span>{ticket.quantity} ticket(s) purchased</span>
        </div>
        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm text-muted-foreground">Total Paid</span>
          <span className="text-lg font-bold text-primary">${ticket.total.toFixed(2)}</span>
        </div>
        <Button variant="outline" className="mt-2 w-full bg-transparent">
          View Details
        </Button>
      </CardContent>
    </Card>
  )
}
