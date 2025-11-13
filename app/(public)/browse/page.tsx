"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Globe, Mails as Masks, Calendar, Heart, Briefcase, ChevronRight } from "lucide-react"

import { EventCard } from "@/components/events/event-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { getAllEvents } from "@/lib/events"
import { MOCK_ARTISTS } from "@/lib/mock-data"
import type { MOCK_EVENTS } from "@/lib/mock-data"

export default function BrowsePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = [
    { name: "All", icon: null },
    { name: "Conference", icon: Briefcase },
    { name: "Festival", icon: Globe },
    { name: "Networking", icon: Briefcase },
    { name: "Art", icon: Masks },
    { name: "Workshop", icon: Calendar },
    { name: "Gala", icon: Heart },
  ]

  const events = useMemo(() => getAllEvents(), [])

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || selectedCategory === "All" || event.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

  const getEventsThisMonth = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return events.filter((event) => {
      const eventDate = new Date(event.date)
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  const eventsThisMonth = getEventsThisMonth()

  const eventsByCategory = useMemo(() => {
    const grouped: Record<string, typeof MOCK_EVENTS> = {}
    filteredEvents.forEach((event) => {
      if (!grouped[event.category]) {
        grouped[event.category] = []
      }
      grouped[event.category].push(event)
    })
    return grouped
  }, [filteredEvents])

  const featuredEvents = events.slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8 lg:px-8">
      {/* Hero Section */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-balance">
          Discover <span className="text-primary">Amazing Events</span>
        </h1>
      </div>

      <Carousel className="w-full">
        <CarouselContent>
          {featuredEvents.map((event) => (
            <CarouselItem key={event.id} className="basis-full">
              <Link href={`/events/${event.id}`}>
                <div className="relative rounded-xl overflow-hidden h-80 group cursor-pointer">
                  <img
                    src={event.image || "/placeholder.svg"}
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

      {/* Search */}
      <div className="relative text-center">
        <Input
          placeholder="Search events by title, location, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 text-base border-solid border-primary rounded-full border text-center w-9/12"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {categories.map((category) => {
          const IconComponent = category.icon
          const categorySlug = category.name === "All" ? null : category.name.toLowerCase().replace(/\s+/g, "-")

          const categoryButton = (
            <button
              onClick={() => setSelectedCategory(category.name === "All" ? null : category.name)}
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  selectedCategory === category.name || (category.name === "All" && !selectedCategory)
                    ? "border-primary bg-primary/10"
                    : "border-foreground/20 group-hover:border-primary"
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

      {/* Events Happening This Month */}
      {eventsThisMonth.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Happening This Month</h2>
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

      {/* Featured Artists & Speakers */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg">Featured Artists & Speakers</h2>
        <Carousel className="w-full">
          <CarouselContent className="-ml-2">
            {MOCK_ARTISTS.map((artist) => (
              <CarouselItem
                key={artist.id}
                className="pl-2 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
              >
                <Link href={`/artists/${artist.id}`}>
                  <div className="flex flex-col items-center gap-4 group cursor-pointer">
                    <div className="relative w-32 h-32 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary transition-all duration-300">
                      <img
                        src={artist.image || "/placeholder.svg"}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                        {artist.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{artist.role}</p>
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

      {Object.entries(eventsByCategory).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(eventsByCategory).map(([category, events]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center justify-between">
                <Link href={`/category/${category.toLowerCase().replace(/\s+/g, "-")}`}>
                  <h2 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer">{category}</h2>
                </Link>
                <Badge variant="secondary">{events.length} events</Badge>
              </div>
              <Carousel className="w-full">
                <CarouselContent className="-ml-2">
                  {events.map((event) => (
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
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">No events found matching your criteria.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("")
              setSelectedCategory(null)
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  )
}
