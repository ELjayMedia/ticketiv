'use client'

import React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, CalendarDays, Users, Zap } from "lucide-react"

import { EventCardStandard } from "@/components/standardized/event-card-standard"
import type { EventCardData } from "@/components/standardized/event-card-standard"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { createClient } from "@/lib/supabase"

interface ArtistRecord {
  id: string
  name: string
  avatar_url?: string
  role?: string
}

interface HomeClientProps {
  initialEvents: EventCardData[]
}

export default function HomeClient({ initialEvents }: HomeClientProps) {
  const router = useRouter()
  const [artists, setArtists] = useState<ArtistRecord[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    let cancelled = false
    async function loadArtists() {
      const { data, error } = await supabase!.from("artists").select("*").limit(15)
      if (error) return
      if (!cancelled) setArtists(data as ArtistRecord[])
    }

    loadArtists()
    return () => { cancelled = true }
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const featuredEvents = initialEvents.slice(0, 3)
  const hasEvents = initialEvents.length > 0

  return (
    <div className="w-full">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-accent py-20 sm:py-28">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="relative max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-widest mb-4">
            Southern Africa's Event Platform
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary-foreground leading-tight mb-6">
            Discover &amp; Book<br className="hidden sm:block" /> Amazing Events
          </h1>
          <p className="text-primary-foreground/80 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            From concerts and festivals to conferences and community gatherings — find your next experience.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
            <Button size="lg" variant="secondary" asChild className="text-base px-8">
              <Link href="/browse">Browse Events</Link>
            </Button>
            <Button size="lg" variant="outline" asChild
              className="text-base px-8 border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 bg-transparent"
            >
              <Link href="/host">Host an Event</Link>
            </Button>
          </div>

          <div className="max-w-md mx-auto">
            <SearchInput
              placeholder="Search events, artists, organisers…"
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
            />
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b bg-muted/40">
        <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-3 gap-4 text-center">
          <div>
            <CalendarDays className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">{initialEvents.length}+</p>
            <p className="text-xs text-muted-foreground">Events Listed</p>
          </div>
          <div>
            <Users className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">100+</p>
            <p className="text-xs text-muted-foreground">Organisers</p>
          </div>
          <div>
            <Zap className="h-6 w-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold">ESwatini</p>
            <p className="text-xs text-muted-foreground">&amp; Region</p>
          </div>
        </div>
      </section>

      <div className="max-w-[980px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Featured carousel */}
        {featuredEvents.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Featured Events</h2>
              <Link href="/browse" className="text-sm text-primary hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <Carousel className="w-full">
              <CarouselContent>
                {featuredEvents.map((event) => (
                  <CarouselItem key={event.id} className="basis-full">
                    <Link href={`/events/${event.id}`}>
                      <div className="relative rounded-xl overflow-hidden h-64 sm:h-80 group cursor-pointer">
                        <img
                          src={event.cover_image_url || "/placeholder.svg"}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
                        <div className="absolute inset-0 flex flex-col p-6 sm:p-10 justify-end items-start">
                          <h3 className="text-2xl font-bold text-white mb-3">{event.title}</h3>
                          <Button size="lg" className="gap-2">
                            Explore Event <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex left-4" />
              <CarouselNext className="hidden sm:flex right-4" />
            </Carousel>
          </section>
        )}

        {/* All events grid */}
        {hasEvents && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">All Events</h2>
              <Link href="/browse" className="text-sm text-primary hover:underline flex items-center gap-1">
                Browse all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {initialEvents.map((event) => (
                <EventCardStandard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {!hasEvents && (
          <section className="text-center py-20">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No events yet</h2>
            <p className="text-muted-foreground mb-6">Be the first to list an event on Ticketiv.</p>
            <Button asChild>
              <Link href="/host">Host an Event</Link>
            </Button>
          </section>
        )}

        {/* Artists */}
        {artists.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Featured Artists &amp; Speakers</h2>
            <Carousel className="w-full">
              <CarouselContent className="-ml-2">
                {artists.map((artist) => (
                  <CarouselItem key={artist.id} className="pl-2 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                    <Link href={`/artists/${artist.id}`}>
                      <div className="flex flex-col items-center gap-3 group cursor-pointer">
                        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300">
                          <img
                            src={artist.avatar_url || "/placeholder.svg"}
                            alt={artist.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">{artist.name}</p>
                          {artist.role && <p className="text-xs text-muted-foreground">{artist.role}</p>}
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </Carousel>
          </section>
        )}

        {/* CTA footer banner */}
        <section className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to host your own event?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create, manage and sell tickets to your events in minutes. No setup fees.
          </p>
          <Button size="lg" asChild>
            <Link href="/signup?type=organizer">Get Started Free</Link>
          </Button>
        </section>
      </div>
    </div>
  )
}
