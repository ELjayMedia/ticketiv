"use client"

import { useEffect, useState } from "react"

import { EventCard } from "@/components/events/event-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getEventsUsingClient } from "@/lib/events-client"
import type { EventSummary } from "@/types"

interface BrowseClientProps {
  initialEvents: EventSummary[]
}

const CATEGORIES = ["All", "Conference", "Festival", "Networking", "Workshop", "Gala"]

export default function BrowseClient({ initialEvents }: BrowseClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [events, setEvents] = useState<EventSummary[]>(initialEvents)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let active = true

    async function fetchEvents() {
      setLoading(true)
      try {
        const result = await getEventsUsingClient({
          category: selectedCategory && selectedCategory !== "All" ? selectedCategory : undefined,
          search: searchQuery || undefined,
        })
        if (active) {
          setEvents(result)
        }
      } catch (error) {
        console.error("Failed to fetch events", error)
        if (active) {
          setEvents(initialEvents)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    const debounce = setTimeout(fetchEvents, 250)

    return () => {
      active = false
      clearTimeout(debounce)
    }
  }, [selectedCategory, searchQuery, initialEvents])

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Find your next event</h1>
        <p className="text-muted-foreground">
          Search and filter the catalogue without extra carousels or distracting sections.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          placeholder="Search by title, location, or category"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 text-base"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category || (!selectedCategory && category === "All")

            return (
              <Button
                key={category}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category === "All" ? null : category)}
              >
                {category}
              </Button>
            )
          })}
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Updating results...</p>}

      {events.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No events match those filters yet. Try clearing the search or choosing a different category.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
