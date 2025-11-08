"use client"

import { useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { MOCK_EVENTS } from "@/lib/mock-data"
import { ArrowLeft, MapPin, Clock } from "lucide-react"

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const slug = (params.slug as string).replace(/-/g, " ")

  const categoryEvents = useMemo(() => {
    return MOCK_EVENTS.filter((event) => event.category.toLowerCase() === slug.toLowerCase())
  }, [slug])

  const eventCount = categoryEvents.length

  const EventCard = ({ event }: { event: (typeof MOCK_EVENTS)[0] }) => (
    <Link href={`/events/${event.id}`}>
      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary cursor-pointer overflow-hidden">
        <div className="relative w-full h-64 group overflow-hidden">
          <img
            src={event.image || "/placeholder.svg"}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <Badge className="absolute top-3 right-3 bg-primary">{event.category}</Badge>

          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <h3 className="text-white font-semibold text-base mb-2 line-clamp-2">{event.title}</h3>
            <div className="flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
              <span className="font-bold text-primary">${event.price}</span>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-xs mt-2">
              <Clock className="w-3 h-3" />
              <span className="line-clamp-1">{event.date}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-primary hover:underline">
        <ArrowLeft size={20} />
        Back to Events
      </button>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold text-balance capitalize">{slug}</h1>
        <p className="text-lg text-muted-foreground">{eventCount} events found in this category</p>
      </div>

      {/* Events Carousel */}
      {eventCount > 0 ? (
        <Carousel className="w-full">
          <CarouselContent className="-ml-2">
            {categoryEvents.map((event) => (
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
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg mb-4">No events found in this category.</p>
          <Button onClick={() => router.push("/browse")}>Browse All Events</Button>
        </div>
      )}
    </div>
  )
}
