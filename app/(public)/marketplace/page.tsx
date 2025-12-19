import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Search } from "lucide-react"
import { formatCurrency } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { q?: string; category?: string; sort?: string }
}) {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Marketplace not available</p>
      </div>
    )
  }

  // Fetch active resale listings
  let query = supabase
    .from("resale_listings")
    .select(
      `
      *,
      ticket:tickets(
        id,
        event:events(id, title, starts_at, cover_image_url, category),
        ticket_type:ticket_types(name)
      )
    `,
    )
    .eq("status", "active")

  if (searchParams.q) {
    // Search would require full-text search or client-side filtering
  }

  if (searchParams.category) {
    query = query.eq("ticket.event.category", searchParams.category)
  }

  const { data: listings = [] } = await query.order("created_at", { ascending: false }).limit(24)

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-background pb-20">
        <div className="p-4 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">Ticket Marketplace</h1>
            <p className="text-sm text-muted-foreground">Buy tickets from other attendees</p>
          </div>

          {/* Mobile Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Select>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="arts">Arts</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile Listings */}
          <div className="space-y-3">
            {listings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                  No tickets available for resale
                </CardContent>
              </Card>
            ) : (
              listings.map((listing: any) => (
                <Card key={listing.id}>
                  <CardContent className="p-0">
                    <div className="flex gap-3 p-3">
                      {listing.ticket.event.cover_image_url && (
                        <img
                          src={listing.ticket.event.cover_image_url || "/placeholder.svg"}
                          alt={listing.ticket.event.title}
                          className="w-20 h-20 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{listing.ticket.event.title}</p>
                        <p className="text-xs text-muted-foreground">{listing.ticket.ticket_type.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(listing.ticket.event.starts_at).toLocaleDateString()}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <p className="font-bold text-primary">{formatCurrency(listing.price)}</p>
                          <Button size="sm">
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Buy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block min-h-screen bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Ticket Marketplace</h1>
            <p className="text-muted-foreground">Buy verified tickets safely from other attendees</p>
          </div>

          {/* Desktop Search & Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search events, artists, or venues..." className="pl-9" />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="music">Music</SelectItem>
                <SelectItem value="sports">Sports</SelectItem>
                <SelectItem value="arts">Arts & Theater</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="recent">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="date">Event Date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Listings Grid */}
          {listings.length === 0 ? (
            <Card>
              <CardContent className="py-24 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">No Tickets Available</p>
                <p className="text-muted-foreground">Check back later for resale listings</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing: any) => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  {listing.ticket.event.cover_image_url && (
                    <img
                      src={listing.ticket.event.cover_image_url || "/placeholder.svg"}
                      alt={listing.ticket.event.title}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{listing.ticket.event.title}</CardTitle>
                      {listing.ticket.event.category && (
                        <Badge variant="secondary" className="shrink-0">
                          {listing.ticket.event.category}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{listing.ticket.ticket_type.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      {new Date(listing.ticket.event.starts_at).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(listing.price)}</p>
                      </div>
                      <Button>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
