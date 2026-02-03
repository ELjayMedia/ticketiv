'use client'

import React from "react"
import Link from "next/link"
import { ChevronRight, Zap, Calendar, Sparkles } from "lucide-react"
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
  const thisWeekend = initialEvents.slice(1, 5)
  const upcoming = initialEvents.slice(5)

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground hover:opacity-80 transition-opacity">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">Ticketiv</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/browse" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Browse
            </Link>
            <Link href="/browse?filter=weekend" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              This Weekend
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-gradient-to-b from-primary/5 via-accent/5 to-transparent py-8 sm:py-12 lg:py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 hover:border-primary/40 transition-colors">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">Discover Amazing Events</span>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
              Find Your Next <span className="text-primary">Experience</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover concerts, conferences, festivals, and unforgettable moments happening near you
            </p>
          </div>

          <div className="pt-4 max-w-xl mx-auto">
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
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-7xl mx-auto space-y-16 lg:space-y-20">
          
          {/* Featured Event Hero - Only show if we have featured event */}
          {featured.length > 0 && (
            <section className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Featured Event</span>
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Don't Miss Out</h2>
              </div>
              
              <Link href={`/events/${featured[0].slug}`} className="group block">
                <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden aspect-video bg-muted shadow-lg hover:shadow-2xl transition-shadow duration-300">
                  <img
                    src={featured[0].poster_url || "/placeholder.svg"}
                    alt={featured[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  
                  <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-10 text-white space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-balance">
                        {featured[0].title}
                      </h3>
                      <p className="text-sm sm:text-base text-white/90 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {featured[0].starts_at ? new Date(featured[0].starts_at).toLocaleDateString() : "Date TBA"}
                      </p>
                    </div>
                    <Button size="lg" className="w-fit gap-2 group/btn">
                      Explore Event
                      <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* This Weekend Section */}
          {thisWeekend.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">This Weekend</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">Happening soon near you</p>
                </div>
                <Link 
                  href="/browse?filter=weekend" 
                  className="hidden sm:flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Mobile: Show as list, Desktop: Show as grid */}
              <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
                {thisWeekend.map((event) => (
                  <EventCardStandard key={event.id} event={event} />
                ))}
              </div>

              <Link 
                href="/browse?filter=weekend" 
                className="sm:hidden block"
              >
                <Button variant="outline" className="w-full gap-2">
                  View all weekend events
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </section>
          )}

          {/* Upcoming Events Section */}
          {upcoming.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Upcoming Events</h2>
                  <p className="text-sm text-muted-foreground">More to explore</p>
                </div>
                <Link 
                  href="/browse" 
                  className="hidden sm:flex items-center gap-2 text-sm font-semibold text-primary hover:gap-3 transition-all"
                >
                  View all
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Mobile: Show as list, Desktop: Show as 3-column grid */}
              <div className="space-y-2 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
                {upcoming.map((event) => (
                  <EventCardStandard key={event.id} event={event} />
                ))}
              </div>

              <Link 
                href="/browse" 
                className="sm:hidden block"
              >
                <Button variant="outline" className="w-full gap-2">
                  View all events
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </section>
          )}

          {/* Empty State */}
          {initialEvents.length === 0 && (
            <section className="py-16 sm:py-24">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="rounded-full bg-muted p-4">
                  <Calendar className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">No events yet</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Check back soon for amazing events happening in your area
                  </p>
                </div>
                <Button asChild size="lg" className="mt-4">
                  <Link href="/browse">Browse All Events</Link>
                </Button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Ticketiv</h4>
              <p className="text-sm text-muted-foreground">Discover and book tickets to amazing events</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Browse</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><Link href="/browse" className="hover:text-foreground transition-colors">All Events</Link></li>
                <li><Link href="/browse?filter=weekend" className="hover:text-foreground transition-colors">This Weekend</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Connect</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li><Link href="/organisers" className="hover:text-foreground transition-colors">For Organisers</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2026 Ticketiv. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
