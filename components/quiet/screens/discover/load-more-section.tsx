"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/quiet/ui/button"
import type { DiscoverEvent } from "@/lib/mappers/discover"

interface LoadMoreSectionProps {
  initialEvents: DiscoverEvent[]
  totalCount: number
  batchSize?: number
  category?: string
  /** "tonight" | "thisWeek" — passed to API for server-side when-filter */
  when?: string
  renderEvents: (events: DiscoverEvent[]) => React.ReactNode
}

export function LoadMoreSection({
  initialEvents,
  totalCount,
  batchSize = 9,
  category,
  when,
  renderEvents,
}: LoadMoreSectionProps) {
  const [events, setEvents] = useState<DiscoverEvent[]>(initialEvents)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialEvents.length < totalCount)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        offset: String(events.length),
        limit: String(batchSize),
      })
      if (category) params.set("category", category)
      if (when) params.set("when", when)

      const res = await fetch(`/api/discover/events?${params}`)
      if (!res.ok) throw new Error("fetch failed")
      const data: { events: DiscoverEvent[]; hasMore: boolean } = await res.json()
      setEvents((prev) => [...prev, ...data.events])
      setHasMore(data.hasMore)
    } catch {
      // silently ignore; user can retry
    } finally {
      setLoading(false)
    }
  }, [events.length, batchSize, category, when, loading, hasMore])

  return (
    <div>
      {renderEvents(events)}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-2 border-t-ink" />
                Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
