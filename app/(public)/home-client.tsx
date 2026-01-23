'use client'

import React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, CalendarDays, Music, Martini, Theater, Gamepad2, Briefcase, UtensilsCrossed, Heart } from "lucide-react"

import { EventCard } from "@/components/events/event-card"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
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
  const router = useRouter()
  const [artists, setArtists] = useState<ArtistRecord[]>([])
  const [selectedCategory, setSelectedCategory] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const featuredEvents = initialEvents.slice(0, 3)

  return (
    <div className="max-w-[980px] mx-auto sm:px-6 lg:px-8 py-0 px-0 sm:py-8">
      <div className="space-y-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl text-balance text-center font-light font-sans leading-7 my-0">
          Discover <span className="text-primary">Amazing Events</span>
        </h1>
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <SearchInput
              placeholder="Search events, organisers, artists…"
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
            />
          </div>
        </div>
      </div>

      <Carousel className="w-full mt-8 sm:mt-12">
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
                  <div className="absolute inset-0 flex flex-col p-4 sm:p-8 justify-end items-start rounded-xs shadow-none sm:pb-8 sm:pt-8">
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
          window.location.href = `/browse?category=${id}`
        }}
        className="mt-8"
      />

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
