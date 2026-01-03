import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShieldAlert, Mail, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function TicketRevokedPage({ params }: { params: { id: string } }) {
  // In production, fetch ticket details
  const ticket = {
    id: params.id,
    ticket_code: "TKT-ABC123",
    event_title: "AfroFest 2025",
    revoked_at: "2025-01-28T10:00:00Z",
    revoked_reason: "Chargeback detected",
  }

  if (!ticket) {
    notFound()
  }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
          <Link href="/app/tickets">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-semibold">Ticket Revoked</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Warning Hero */}
          <div className="text-center space-y-4 py-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-2">
              <ShieldAlert className="h-12 w-12 text-destructive" strokeWidth={2} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-balance">Ticket Revoked</h1>
              <p className="text-muted-foreground">This ticket is no longer valid</p>
            </div>
          </div>

          {/* Ticket Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Ticket Details</CardTitle>
                <Badge variant="destructive">Revoked</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Event</p>
                <p className="font-semibold">{ticket.event_title}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-1">Ticket Code</p>
                <p className="font-mono font-medium">{ticket.ticket_code}</p>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-1">Revoked On</p>
                <p className="font-medium">{new Date(ticket.revoked_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Why Was This Revoked?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {ticket.revoked_reason ||
                  "This ticket has been revoked and cannot be used for entry. This may occur due to payment issues, policy violations, or at the organizer's discretion."}
              </p>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Important:</strong> This ticket will not be accepted at the event
                  entrance. Please contact support if you believe this was done in error.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button asChild className="w-full h-12">
              <Link href="/help">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full h-12 bg-transparent">
              <Link href="/app/tickets">View My Tickets</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[680px] px-4 py-12">
          {/* Warning Hero */}
          <div className="text-center space-y-6 py-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/10">
              <ShieldAlert className="h-16 w-16 text-destructive" strokeWidth={2} />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-balance">Ticket Revoked</h1>
              <p className="text-lg text-muted-foreground">This ticket is no longer valid for entry</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Ticket Information</CardTitle>
                <Badge variant="destructive" className="text-sm">
                  Revoked
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Event</p>
                  <p className="text-lg font-semibold">{ticket.event_title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ticket Code</p>
                  <p className="text-lg font-mono font-medium">{ticket.ticket_code}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">Revoked On</p>
                <p className="font-medium">{new Date(ticket.revoked_at).toLocaleString()}</p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Why Was This Revoked?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {ticket.revoked_reason ||
                    "This ticket has been revoked and cannot be used for entry. This may occur due to payment issues, policy violations, or at the organizer's discretion."}
                </p>

                <div className="bg-destructive/10 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong className="text-destructive">Important:</strong> This ticket will not be accepted at the
                    event entrance. If you believe this was done in error, please contact our support team immediately.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Button asChild className="w-full" size="lg">
                  <Link href="/help">
                    <Mail className="h-4 w-4 mr-2" />
                    Contact Support
                  </Link>
                </Button>
                <Button variant="outline" asChild className="w-full bg-transparent">
                  <Link href="/app/tickets">View My Tickets</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
