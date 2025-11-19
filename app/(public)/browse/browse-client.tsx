"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Globe, Calendar, Heart, Briefcase, ChevronRight } from "lucide-react"

import { EventCard } from "@/components/events/event-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { getEventsUsingClient } from "@/lib/events-client"
import type { ArtistRecord, EventSummary } from "@/types"
import { createClient } from "@/lib/supabase"

interface BrowseClientProps {
  initialEvents: EventSummary[]
}

const CATEGORIES = [
  { name: "All" },
  { name: "Conference", icon: Briefcase },
  { name: "Festival", icon: Globe },
  { name: "Networking", icon: Briefcase },
  { name: "Workshop", icon: Calendar },
  { name: "Gala", icon: Heart },
]

export default function BrowseClient({ initialEvents }: BrowseClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [events, setEvents] = useState<EventSummary[]>(initialEvents)
  const [loading, setLoading] = useState(false)
  const [artists, setArtists] = useState<ArtistRecord[]>([])

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

  useEffect(() => {
    const supabase = createClient()
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

  const eventsThisMonth = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    return events
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
  }, [events])

  const featuredEvents = events.slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8 lg:px-8">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-balance">
          Discover <span className="text-primary">Amazing Events</span>
        </h1>
        {loading && <p className="text-sm text-muted-foreground">Loading events...</p>}
      </div>

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

      <div className="relative text-center">
        <Input
          placeholder="Search events by title, location, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 text-base border-solid border-primary rounded-full border text-center w-9/12"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {CATEGORIES.map((category) => {
          const IconComponent = category.icon
          const isActive = selectedCategory === category.name || (!selectedCategory && category.name === "All")
          const categorySlug = category.name === "All" ? null : category.name.toLowerCase().replace(/\s+/g, "-")

          const categoryButton = (
            <button onClick={() => setSelectedCategory(category.name === "All" ? null : category.name)} className="flex flex-col items-center gap-2 group">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isActive ? "border-primary bg-primary/10" : "border-foreground/20 group-hover:border-primary"
                }`}
                style={{ borderWidth: "1px" }}
              >
                {IconComponent ? (
                  <IconComponent className="w-6 h-6" />
                ) : (
                  <span className="text-xs font-semibold">All</span>
                )}
              </div>
              <span className="text-xs font-medium text-center">{category.name}</span>
            </button>
          )

          return (
            <div key={category.name}>
              {categorySlug ? <Link href={`/category/${categorySlug}`}>{categoryButton}</Link> : categoryButton}
            </div>
          )
        })}
      </div>

      {eventsThisMonth.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Happening This Month</h2>
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {eventsThisMonth.map((event) => (
                <CarouselItem key={event.id} className="pl-2 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                  <EventCard event={event} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>
      )}

      {events.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">All Events</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {artists.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Featured Artists & Speakers</h2>
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {artists.map((artist) => (
                <CarouselItem key={artist.id} className="pl-2 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
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
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{artist.name}</h3>
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
