import { Calendar, ShoppingBag, Ticket, AlertCircle, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import Link from "next/link"

export function NoEventsFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Calendar className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No events found</EmptyTitle>
        <EmptyDescription>
          We couldn't find any events matching your search. Try adjusting your filters or check back later for new
          events.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/browse">Browse all events</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function NoTicketsYet() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Ticket className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No tickets yet</EmptyTitle>
        <EmptyDescription>
          You haven't purchased any tickets yet. Discover amazing events and get your tickets now!
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/browse">Explore events</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function NoOrdersFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShoppingBag className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No orders found</EmptyTitle>
        <EmptyDescription>
          You don't have any orders yet. When customers purchase tickets to your events, they'll appear here.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href="/events">View your events</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function NoEventsCreated() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Package className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No events created</EmptyTitle>
        <EmptyDescription>
          Get started by creating your first event. It only takes a few minutes to set up and publish.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/events/new">Create your first event</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function SearchNoResults({ query }: { query?: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>
          {query ? (
            <>
              We couldn't find anything matching "<strong>{query}</strong>". Try a different search term.
            </>
          ) : (
            "We couldn't find any matches. Try adjusting your search."
          )}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
