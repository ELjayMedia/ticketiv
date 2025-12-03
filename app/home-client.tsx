"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { EventCard } from "@/components/events/event-card"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import type { ArtistRecord, EventSummary } from "@/types"
import { createClient } from "@/lib/supabase"

interface HomeClientProps {
  initialEvents: EventSummary[]
}

export default function HomeClient({ initialEvents }: HomeClientProps) {
  const [artists, setArtists] = useState<ArtistRecord[]>([])

  useEffect(() => {
    const supabase = createClient()

    if (!supabase) {
      console.warn("Supabase client not available. Skipping artist data fetch.")
      return
    }

    let cancelled = false

    async function loadArtists() {
      const { data, error } = await supabase.from("artists").select("*").limit(15)
      if (error) {
        console.warn("Failed to load artists", error)
        return
      }
      if (!cancelled) {
        setArtists(data as ArtistRecord[])
      }
    }

    loadArtists()

    return () => {
      cancelled = true
    }
  }, [])

  const eventsThisWeekend = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()

    // Calculate Friday of this week
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
    const fridayStart = new Date(now)
    fridayStart.setDate(now.getDate() + daysUntilFriday)
    fridayStart.setHours(0, 0, 0, 0)

    // Calculate Monday of next week
    const sundayEnd = new Date(fridayStart)
    sundayEnd.setDate(fridayStart.getDate() + 2)
    sundayEnd.setHours(23, 59, 59, 999)

    return initialEvents
      .filter((event) => {
        if (!event.starts_at) return false
        const date = new Date(event.starts_at)
        return date >= fridayStart && date <= sundayEnd
      })
      .sort((a, b) => {
        const aDate = a.starts_at ? new Date(a.starts_at).getTime() : Number.POSITIVE_INFINITY
        const bDate = b.starts_at ? new Date(b.starts_at).getTime() : Number.POSITIVE_INFINITY
        return aDate - bDate
      })
  }, [initialEvents])

  const eventsThisMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    return initialEvents
      .filter((event) => {
        if (!event.starts_at) return false
        const date = new Date(event.starts_at)
        return date.getMonth() === month && date.getFullYear() === year
      })
      .sort((a, b) => {
        const aDate = a.starts_at ? new Date(a.starts_at).getTime() : Number.POSITIVE_INFINITY
        const bDate = b.starts_at ? new Date(b.starts_at).getTime() : Number.POSITIVE_INFINITY
        return aDate - bDate
      })
  }, [initialEvents])

  const trendingEvents = useMemo(() => {
    return [...initialEvents]
      .sort((a, b) => {
        const aViews = a.view_count || 0
        const bViews = b.view_count || 0
        return bViews - aViews
      })
      .slice(0, 12)
  }, [initialEvents])

  const featuredEvents = initialEvents.slice(0, 3)

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-12 space-y-12 lg:px-8">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-balance">
          Discover <span className="text-primary">Amazing Events</span>
        </h1>
      </div>

      {/* Featured Carousel */}
      <Carousel className="w-full">
        <CarouselContent>
          {featuredEvents.map((event) => (
            <CarouselItem key={event.id} className="basis-full">
              <Link href={`/events/${event.id}`}>
                <div className="relative rounded-xl overflow-hidden h-80 group cursor-pointer">
                  <img
                    src={event.cover_image_url || "/placeholder.svg"}
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-center p-8">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">{event.title}</h2>
                    <Button size="lg" className="w-fit gap-2">
                      Get Tickets Now
                      <ChevronRight className="w-4 h-4" />
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

      {/* This Weekend Section */}
      {eventsThisWeekend.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-2xl">This Weekend</h2>
            <Link href="/browse?filter=weekend" className="text-primary hover:underline text-sm">
              See All
            </Link>
          </div>
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {eventsThisWeekend.map((event) => (
                <CarouselItem
                  key={event.id}
                  className="pl-2 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                >
                  <EventCard event={event} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      )}

      {/* This Month Section */}
      {eventsThisMonth.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-2xl">Happening This Month</h2>
            <Link href="/browse?filter=month" className="text-primary hover:underline text-sm">
              See All
            </Link>
          </div>
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {eventsThisMonth.map((event) => (
                <CarouselItem
                  key={event.id}
                  className="pl-2 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                >
                  <EventCard event={event} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      )}

      {/* Trending Events Section */}
      {trendingEvents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-2xl">Trending Now</h2>
            <Link href="/browse?filter=trending" className="text-primary hover:underline text-sm">
              See All
            </Link>
          </div>
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {trendingEvents.map((event) => (
                <CarouselItem
                  key={event.id}
                  className="pl-2 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                >
                  <EventCard event={event} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      )}

      {/* Featured Artists & Speakers Section */}
      {artists.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-2xl">Featured Artists & Speakers</h2>
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {artists.map((artist) => (
                <CarouselItem
                  key={artist.id}
                  className="pl-2 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                >
                  <Link href={`/artists/${artist.id}`}>
                    <div className="flex flex-col items-center gap-4 group cursor-pointer">
                      <div className="relative w-32 h-32 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300">
                        <img
                          src={artist.avatar_url || "/placeholder.svg"}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                          {artist.name}
                        </h3>
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
        </div>
      )}
    </div>
  )
}
