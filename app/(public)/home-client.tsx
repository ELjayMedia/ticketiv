"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ChevronRight,
  CalendarDays,
  Music,
  Martini,
  Theater,
  Gamepad2,
  Briefcase,
  UtensilsCrossed,
  Heart,
} from "lucide-react"

import { EventCard } from "@/components/events/event-card"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { CategoryRail } from "@/components/ui/category-rail"
import type { CategoryItem } from "@/components/ui/category-rail"
import type { ArtistRecord, EventSummary } from "@/types"
import { createClient } from "@/lib/supabase"

const CATEGORY_ITEMS: CategoryItem[] = [
  { id: "nye", label: "NYE", icon: CalendarDays, isNew: true },
  { id: "music", label: "Music", icon: Music },
  { id: "nightlife", label: "Nightlife", icon: Martini },
  { id: "arts", label: "Performing & Visual Arts", icon: Theater },
  { id: "hobbies", label: "Hobbies", icon: Gamepad2 },
  { id: "business", label: "Business", icon: Briefcase },
  { id: "food", label: "Food & Drink", icon: UtensilsCrossed },
  { id: "dating", label: "Dating", icon: Heart },
]

interface HomeClientProps {
  initialEvents: EventSummary[]
}

export default function HomeClient({ initialEvents }: HomeClientProps) {
  const [artists, setArtists] = useState<ArtistRecord[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("")

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

    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
    const fridayStart = new Date(now)
    fridayStart.setDate(now.getDate() + daysUntilFriday)
    fridayStart.setHours(0, 0, 0, 0)

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
    <div className="max-w-[980px] mx-auto sm:px-6 space-y-8 sm:space-y-12 lg:px-8 py-0 px-0 sm:py-8">
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-balance text-center font-light font-sans leading-7 my-0">
          Discover <span className="text-primary">Amazing Events</span>
        </h1>
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
                  <div className="absolute inset-0 flex flex-col p-4 sm:p-8 justify-end items-start rounded-xs shadow-none">
                    <h2 className="text-2xl font-bold text-white mb-2 sm:mb-4 sm:text-2xl font-sans mt-0">
                      {event.title}
                    </h2>
                    <Button size="lg" className="w-fit gap-2 text-sm sm:text-base">
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

      <CategoryRail
        items={CATEGORY_ITEMS}
        value={selectedCategory}
        onChange={(id) => {
          setSelectedCategory(id)
          // Navigate to browse page with category filter
          window.location.href = `/browse?category=${id}`
        }}
        className="mt-8"
      />

      {eventsThisWeekend.length > 0 && (
        <div className="space-y-px">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl sm:text-2xl font-sans">This Weekend</h2>
            <Link href="/browse?filter=weekend" className="text-primary hover:underline text-xs sm:text-sm">
              See All
            </Link>
          </div>
          <div className="lg:hidden space-y-3">
            {eventsThisWeekend.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Carousel className="w-full hidden lg:block">
            <CarouselContent className="-ml-2">
              {eventsThisWeekend.map((event) => (
                <CarouselItem key={event.id} className="pl-2 basis-[25%]">
                  <EventCard event={event} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {eventsThisMonth.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl sm:text-2xl font-sans">Happening This Month</h2>
            <Link href="/browse?filter=month" className="text-primary hover:underline text-xs sm:text-sm">
              See All
            </Link>
          </div>
          <div className="lg:hidden space-y-3">
            {eventsThisMonth.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Carousel className="w-full hidden lg:block">
            <CarouselContent className="-ml-2">
              {eventsThisMonth.map((event) => (
                <CarouselItem key={event.id} className="pl-2 basis-[25%]">
                  <EventCard event={event} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {trendingEvents.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl sm:text-2xl font-sans">Trending Now</h2>
            <Link href="/browse?filter=trending" className="text-primary hover:underline text-xs sm:text-sm">
              See All
            </Link>
          </div>
          <div className="lg:hidden space-y-3">
            {trendingEvents.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
          <Carousel className="w-full hidden lg:block">
            <CarouselContent className="-ml-2">
              {trendingEvents.map((event) => (
                <CarouselItem key={event.id} className="pl-2 basis-[25%]">
                  <EventCard event={event} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      )}

      {artists.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-xl sm:text-2xl">Featured Artists & Speakers</h2>
          <Carousel className="w-full">
            <CarouselContent className="-ml-2">
              {artists.map((artist) => (
                <CarouselItem key={artist.id} className="pl-2 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <Link href={`/artists/${artist.id}`}>
                    <div className="flex flex-col items-center gap-4 group cursor-pointer">
                      <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300">
                        <img
                          src={artist.avatar_url || "/placeholder.svg"}
                          alt={artist.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors">
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
