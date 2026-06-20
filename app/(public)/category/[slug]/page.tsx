import Link from "next/link"
import { notFound } from "next/navigation"

import { EventCardStandard as EventCard } from "@/components/standardized/event-card-standard"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { getPublicEventsList } from "@/lib/adapters/events"

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

function formatCategory(slug: string) {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const categoryName = formatCategory(slug)
  const events = await getPublicEventsList({ category: categoryName })

  if (!events || events.length === 0) notFound()

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Category</p>
        <h1 className="text-h1">{categoryName} events</h1>
        <p className="text-[14px] text-ink-3">
          Discover upcoming events in the {categoryName} category.
        </p>
      </div>

      <Card>
        <CardBody className="px-5 py-4">
          <p className="text-label">Events</p>
        </CardBody>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="text-center">
        <Link
          href="/"
          className="text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
        >
          Browse all events
        </Link>
      </div>
    </main>
  )
}
