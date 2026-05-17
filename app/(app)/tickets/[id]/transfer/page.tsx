import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Gift, DollarSign } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TransferTicketPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  // A "ticket" is an order_item; its event is reached via the ticket type.
  const { data: orderItem } = await supabase
    .from("order_items")
    .select(
      `
      id,
      ticket_type:ticket_types(
        name, price_cents, currency,
        event:events(id, title, starts_at, cover_image_url)
      )
    `,
    )
    .eq("id", params.id)
    .single()

  if (!orderItem) {
    redirect("/app/tickets")
  }

  const ticket = {
    id: orderItem.id,
    ticket_type: orderItem.ticket_type as any,
    event: (orderItem.ticket_type as any)?.event ?? null,
  }

  // Check if ticket has a pending transfer
  const { data: existingTransfer } = await supabase
    .from("transfers")
    .select("*")
    .eq("order_item_id", ticket.id)
    .in("status", ["requested", "pending"])
    .maybeSingle()

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <Link href={`/app/tickets/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ticket
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold">Transfer Ticket</h1>
            <p className="text-sm text-muted-foreground">Send your ticket to someone else</p>
          </div>

          {/* Ticket Info Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                {ticket.event?.cover_image_url && (
                  <img
                    src={ticket.event?.cover_image_url || "/placeholder.svg"}
                    alt={ticket.event?.title}
                    className="w-16 h-16 rounded object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-sm">{ticket.event?.title}</p>
                  <p className="text-xs text-muted-foreground">{ticket.ticket_type?.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(ticket.event?.starts_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {existingTransfer ? (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">Transfer Pending</p>
                  <Badge variant="secondary">Pending</Badge>
                </div>
                <p className="text-sm text-muted-foreground">To: {existingTransfer.to_user_id}</p>
                <p className="text-xs text-muted-foreground">
                  Sent: {new Date(existingTransfer.created_at).toLocaleDateString()}
                </p>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Cancel Transfer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Send as Gift</CardTitle>
                <CardDescription className="text-xs">Transfer ownership to another person</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient-email" className="text-sm">
                    Recipient Email
                  </Label>
                  <Input id="recipient-email" type="email" placeholder="friend@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm">
                    Personal Message (Optional)
                  </Label>
                  <Input id="message" placeholder="Enjoy the event!" />
                </div>
                <Button className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Send Transfer
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">List for Resale</CardTitle>
              <CardDescription className="text-xs">Sell your ticket to another attendee</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resale-price" className="text-sm">
                  Asking Price
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="resale-price"
                    type="number"
                    placeholder={(ticket.ticket_type?.price_cents / 100).toFixed(2)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Original price: {ticket.ticket_type?.currency} {(ticket.ticket_type?.price_cents / 100).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="listing-expires" className="text-sm">
                  Listing Expires
                </Label>
                <Input id="listing-expires" type="date" />
              </div>
              <Button variant="outline" className="w-full bg-transparent">
                <DollarSign className="h-4 w-4 mr-2" />
                List Ticket
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-8 space-y-6">
          <Link href={`/app/tickets/${params.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Ticket
            </Button>
          </Link>

          <div>
            <h1 className="text-3xl font-bold">Transfer or Sell Ticket</h1>
            <p className="text-muted-foreground">Send your ticket as a gift or list it for resale</p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Ticket Info */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.event?.cover_image_url && (
                  <img
                    src={ticket.event?.cover_image_url || "/placeholder.svg"}
                    alt={ticket.event?.title}
                    className="w-full h-48 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h3 className="font-bold text-lg">{ticket.event?.title}</h3>
                  <p className="text-muted-foreground">{ticket.ticket_type?.name}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {new Date(ticket.event?.starts_at).toLocaleString()}
                  </p>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Original Price</p>
                  <p className="text-xl font-bold">
                    {ticket.ticket_type?.currency} {(ticket.ticket_type?.price_cents / 100).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Transfer Section */}
            <div className="space-y-6">
              {existingTransfer ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Transfer Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Transfer Pending</p>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        <strong>To:</strong> {existingTransfer.to_user_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>Sent:</strong> {new Date(existingTransfer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" className="w-full">
                      Cancel Transfer
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle>Send as Gift</CardTitle>
                          <CardDescription>Transfer ownership to another person</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="recipient-email">Recipient Email</Label>
                        <Input id="recipient-email" type="email" placeholder="friend@example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Personal Message (Optional)</Label>
                        <Input id="message" placeholder="Hope you enjoy the event!" />
                      </div>
                      <Button className="w-full">
                        <Send className="h-4 w-4 mr-2" />
                        Send Transfer
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle>List for Resale</CardTitle>
                          <CardDescription>Sell your ticket on the marketplace</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="resale-price">Asking Price</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="resale-price"
                            type="number"
                            step="0.01"
                            placeholder={(ticket.ticket_type?.price_cents / 100).toFixed(2)}
                            className="pl-9"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Original price: {ticket.ticket_type?.currency} {(ticket.ticket_type?.price_cents / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="listing-expires">Listing Expires</Label>
                        <Input id="listing-expires" type="date" />
                        <p className="text-xs text-muted-foreground">
                          Your listing will automatically expire on this date
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted p-4 text-sm">
                        <p className="font-medium mb-2">Marketplace Fee</p>
                        <p className="text-muted-foreground">
                          A 5% service fee will be deducted from your sale price. You'll receive the remaining amount
                          via your preferred payout method.
                        </p>
                      </div>
                      <Button variant="outline" className="w-full bg-transparent">
                        <DollarSign className="h-4 w-4 mr-2" />
                        List Ticket for Sale
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
