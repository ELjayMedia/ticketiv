"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { MOCK_EVENTS } from "@/lib/mock-data"
import { MapPin, Clock, Globe, Mails as Masks, Calendar, Heart, Briefcase, ChevronRight } from "lucide-react"

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

  const filteredEvents = useMemo(() => {
    return MOCK_EVENTS.filter((event) => {
      const matchesSearch =
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !selectedCategory || selectedCategory === "All" || event.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchQuery, selectedCategory])

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

  const featuredEvents = MOCK_EVENTS.slice(0, 3)

  const EventCard = ({ event }: { event: (typeof MOCK_EVENTS)[0] }) => (
    <Link href={`/events/${event.id}`}>
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary cursor-pointer overflow-hidden">
        <div className="aspect-video bg-muted overflow-hidden relative group">
          <img
            src={event.image || "/placeholder.svg"}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <Badge className="absolute top-3 right-3 bg-primary">{event.category}</Badge>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-base">{event.title}</CardTitle>
            </div>
            <div className="text-base font-bold text-primary shrink-0">${event.price}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="line-clamp-1">{event.date}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )

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
          className="h-12 text-base border-solid border-primary rounded-full border w-6/12 text-center"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-8">
        {categories.map((category) => {
          const IconComponent = category.icon
          return (
            <button
              key={category.name}
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
        })}
      </div>

      {Object.entries(eventsByCategory).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(eventsByCategory).map(([category, events]) => (
            <div key={category} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">{category}</h2>
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
