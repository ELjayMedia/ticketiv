import Link from "next/link"
import { notFound } from "next/navigation"

import { EventCard } from "@/components/events/event-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getEventsByCategory } from "@/lib/events"
import type { EventSummary } from "@/types"

interface CategoryPageProps {
  params: { slug: string }
}

function formatCategory(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const categoryName = formatCategory(params.slug)
  const events = await getEventsByCategory(categoryName)

  if (!events || events.length === 0) {
    notFound()
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">{categoryName} Events</h1>
        <p className="text-muted-foreground">Discover upcoming events in the {categoryName} category.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event: EventSummary) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link href="/browse" className="text-primary hover:underline">
          Browse all events
        </Link>
      </div>
    </div>
  )
}
