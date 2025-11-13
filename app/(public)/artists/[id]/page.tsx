"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MOCK_EVENTS, MOCK_ARTISTS } from "@/lib/mock-data"
import { ArrowLeft, MapPin, Clock, Heart, Share2, CheckCircle2, Zap, Users } from "lucide-react"
import { format, parseISO } from "date-fns"

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const artistId = params.id as string
  const [isFollowing, setIsFollowing] = useState(false)

  const artist = useMemo(() => {
    return MOCK_ARTISTS.find((a) => a.id === artistId)
  }, [artistId])

  const artistEvents = useMemo(() => {
    return MOCK_EVENTS.filter((event) => event.artists?.some((a) => a.id === artistId)).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })
  }, [artistId])

  if (!artist) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-primary hover:underline mb-6">
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">Artist not found</p>
          <Button onClick={() => router.push("/browse")} className="mt-4">
            Browse Events
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-64 md:h-96 bg-gradient-to-r from-primary/40 to-primary/20 overflow-hidden">
        <img
          src={artist.banner || "/placeholder.svg?height=400&width=1200"}
          alt={artist.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Artist Title and Follow Count - Bottom Left */}
        <div className="absolute bottom-6 left-6 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">{artist.name}</h1>
          <div className="flex items-center gap-2 text-sm">
            <Users size={16} />
            <span>{artist.followers?.toLocaleString()} followers</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Events List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Info Banner */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3">
              <Users size={20} className="text-primary" />
              <span className="text-sm">
                <strong>{artistEvents.length} events</strong> {artist.name} is performing at
              </span>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm">
                All dates
              </Button>
              <Button variant="outline" size="sm">
                Location
              </Button>
              <Button variant="outline" size="sm">
                Price
              </Button>
            </div>

            {/* Events List */}
            {artistEvents.length > 0 ? (
              <div className="space-y-4">
                {artistEvents.map((event) => {
                  const eventDate = parseISO(event.date)
                  const dayOfWeek = format(eventDate, "EEE").toUpperCase()
                  const dayOfMonth = format(eventDate, "d")
                  const monthYear = format(eventDate, "MMM yyyy").toUpperCase()

                  return (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card className="hover:shadow-md transition-all duration-300 overflow-hidden hover:border-primary cursor-pointer">
                        <CardContent className="p-0">
                          <div className="flex gap-4 p-4">
                            {/* Date Section */}
                            <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-3 min-w-fit">
                              <div className="text-xs font-semibold text-muted-foreground">{monthYear}</div>
                              <div className="text-2xl font-bold text-primary">{dayOfMonth}</div>
                              <div className="text-xs font-semibold text-muted-foreground">{dayOfWeek}</div>
                            </div>

                            {/* Event Info */}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-base line-clamp-1">{event.title}</h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <MapPin size={14} className="text-muted-foreground flex-shrink-0" />
                                    <p className="text-sm text-muted-foreground">{event.venue}</p>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                                    <p className="text-sm text-muted-foreground">{event.time}</p>
                                  </div>
                                </div>
                                <Button size="sm" className="shrink-0">
                                  See Tickets
                                </Button>
                              </div>

                              {/* Status Badges */}
                              <div className="flex flex-wrap gap-2 pt-2">
                                {event.ticketsAvailable < 50 && (
                                  <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                    <Zap size={12} />
                                    Selling fast
                                  </Badge>
                                )}
                                {event.attendees > 1000 && (
                                  <Badge className="bg-yellow-500 text-white text-xs">Hottest event</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-4">No events found for this artist yet.</p>
                <Button onClick={() => router.push("/browse")}>Browse All Events</Button>
              </div>
            )}
          </div>

          {/* Right Column - Artist Profile */}
          <div className="space-y-6">
            {/* Artist Image and Info */}
            <Card className="overflow-hidden">
              <div className="aspect-square bg-muted overflow-hidden">
                <img
                  src={artist.image || "/placeholder.svg?height=400&width=400"}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary">{artist.genre}</Badge>
                  {artist.verified && <CheckCircle2 size={20} className="text-primary" />}
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <Button
                    variant={isFollowing ? "secondary" : "default"}
                    onClick={() => setIsFollowing(!isFollowing)}
                    className="w-full"
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="flex-1 bg-transparent">
                      <Heart size={18} />
                    </Button>
                    <Button variant="outline" size="icon" className="flex-1 bg-transparent">
                      <Share2 size={18} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio Section */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{artist.description}</p>
                <button className="text-primary font-semibold text-sm hover:underline">See more</button>
              </CardContent>
            </Card>

            {/* Video Section */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-4xl mb-2">🎬</div>
                  <p className="text-sm">Featured Video</p>
                </div>
              </div>
            </Card>

            {/* Music Player Section */}
            <Card className="bg-black text-white overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 bg-primary rounded">
                    <img
                      src="/placeholder.svg?height=48&width=48"
                      alt="track"
                      className="w-full h-full object-cover rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">Featured Track</p>
                    <p className="text-xs text-gray-400">{artist.name}</p>
                  </div>
                  <button className="text-primary">▶</button>
                </div>
              </CardContent>
            </Card>

            {/* Social Links */}
            <div className="flex gap-3 justify-center">
              {artist.socialLinks?.twitter && (
                <a
                  href={artist.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-muted-foreground flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                >
                  𝕏
                </a>
              )}
              {artist.socialLinks?.instagram && (
                <a
                  href={artist.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-muted-foreground flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                >
                  📷
                </a>
              )}
              {artist.socialLinks?.youtube && (
                <a
                  href={artist.socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-muted-foreground flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                >
                  ▶️
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
