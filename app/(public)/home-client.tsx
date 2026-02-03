'use client'

import React from "react"
import Link from "next/link"
import { ChevronRight, Zap, Calendar } from "lucide-react"
import { EventCardStandard } from "@/components/standardized/event-card-standard"
import type { EventCardData } from "@/components/standardized/event-card-standard"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"

interface HomeClientProps {
  initialEvents: EventCardData[]
}

export default function HomeClient({ initialEvents }: HomeClientProps) {
  // Categorize events
  const featured = initialEvents.slice(0, 1)
  const thisWeekend = initialEvents.slice(1, 4)
  const upcoming = initialEvents.slice(4, 10)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Ticketiv</h1>
          <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground">Browse</Link>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-gradient-to-b from-primary/10 via-accent/5 to-transparent pt-8 pb-6 px-4">
        <div className="max-w-2xl mx-auto space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-primary">Discover Amazing Events</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Find Your Next Experience</h2>
          <p className="text-sm text-muted-foreground">Browse concerts, conferences, festivals & more</p>
          <div className="pt-2">
            <SearchInput
              placeholder="Search events, artists, venues…"
              onSubmit={(query) => {
                if (query.trim()) {
                  window.location.href = `/browse?q=${encodeURIComponent(query)}`
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 space-y-12 max-w-4xl">
        {/* Featured Event Hero */}
        {featured.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Featured</h3>
            <Link href={`/events/${featured[0].id}`} className="group block">
              <div className="relative rounded-2xl overflow-hidden aspect-[16/9] bg-muted">
                <img
                  src={featured[0].cover_image_url || "/placeholder.svg"}
                  alt={featured[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white space-y-3">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{featured[0].title}</h2>
                    <p className="text-sm text-white/80 mt-2">{featured[0].location}</p>
                  </div>
                  <Button size="sm" className="w-fit gap-2">
                    View Event
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* This Weekend Section */}
        {thisWeekend.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                This Weekend
              </h3>
              <Link href="/browse?filter=weekend" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {thisWeekend.map((event) => (
                <EventCardStandard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        {upcoming.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">Upcoming Events</h3>
              <Link href="/browse" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((event) => (
                <EventCardStandard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {initialEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No events yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Check back soon for amazing events</p>
            <Button asChild>
              <Link href="/browse">Browse All Events</Link>
            </Button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-8 px-4">
        <div className="container mx-auto max-w-4xl text-center text-sm text-muted-foreground">
          <p>Ticketiv - Event Discovery & Ticketing Platform</p>
        </div>
      </footer>
    </div>
  )
}
