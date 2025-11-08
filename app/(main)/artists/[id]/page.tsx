"use client"

import { useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MOCK_EVENTS, MOCK_ARTISTS } from "@/lib/mock-data"
import {
  ArrowLeft,
  MapPin,
  Clock,
  Heart,
  Share2,
  MessageCircle,
  Users,
  CheckCircle2,
  Music,
  Calendar,
  ShoppingBag,
} from "lucide-react"

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()
  const artistId = params.id as string
  const [isFollowing, setIsFollowing] = useState(false)
  const [likes, setLikes] = useState(0)

  const artist = useMemo(() => {
    return MOCK_ARTISTS.find((a) => a.id === artistId)
  }, [artistId])

  const artistEvents = useMemo(() => {
    return MOCK_EVENTS.filter((event) => event.artists?.some((a) => a.id === artistId))
  }, [artistId])

  const otherArtists = useMemo(() => {
    return MOCK_ARTISTS.filter((a) => a.id !== artistId).slice(0, 4)
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
      <div className="relative h-64 md:h-80 bg-gradient-to-r from-primary/40 to-primary/20 overflow-hidden">
        <img
          src={artist.banner || "/placeholder.svg?height=320&width=1200"}
          alt={artist.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-primary hover:underline my-6">
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-12 md:items-end">
          <div className="flex-shrink-0">
            <img
              src={artist.image || "/placeholder.svg"}
              alt={artist.name}
              className="w-40 h-40 md:w-48 md:h-48 object-cover border-4 border-background shadow-lg rounded-full"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-5xl font-bold">{artist.name}</h1>
              {artist.verified && <CheckCircle2 size={28} className="text-primary" />}
            </div>
            <Badge className="bg-primary mb-4">{artist.genre}</Badge>
            <p className="text-muted-foreground mb-6 max-w-2xl">{artist.description}</p>

            <div className="flex flex-wrap gap-3">
              <Button variant={isFollowing ? "secondary" : "default"} onClick={() => setIsFollowing(!isFollowing)}>
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button variant="outline" size="icon">
                <Heart size={20} fill={likes > 0 ? "currentColor" : "none"} onClick={() => setLikes(likes + 1)} />
              </Button>
              <Button variant="outline" size="icon">
                <Share2 size={20} />
              </Button>
              <Button variant="outline" size="icon">
                <MessageCircle size={20} />
              </Button>
            </div>
          </div>

          <div className="flex gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">{artist.followers?.toLocaleString()}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">{artistEvents.length}</div>
              <div className="text-xs md:text-sm text-muted-foreground">Events</div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="events" className="mb-12">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar size={16} />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Music size={16} />
              <span className="hidden sm:inline">About</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="flex items-center gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger value="related" className="flex items-center gap-2">
              <ShoppingBag size={16} />
              <span className="hidden sm:inline">Related</span>
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Upcoming Events</h2>
              {artistEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artistEvents.map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`}>
                      <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary cursor-pointer overflow-hidden">
                        <div className="aspect-video bg-muted overflow-hidden relative group">
                          <img
                            src={event.image || "/placeholder.svg"}
                            alt={event.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <div className="absolute inset-0 flex flex-col justify-between p-3">
                            <Badge className="w-fit bg-primary">{event.category}</Badge>
                            <div>
                              <h3 className="font-semibold text-white text-sm line-clamp-2 mb-2">{event.title}</h3>
                              <div className="space-y-1 text-xs text-gray-200">
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {event.date}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin size={12} />
                                  {event.location}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 text-primary font-bold">${event.price}</div>
                            <Badge variant="secondary">{event.ticketsAvailable} left</Badge>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg mb-4">No events found for this artist yet.</p>
                  <Button onClick={() => router.push("/browse")}>Browse All Events</Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">About {artist.name}</h2>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground leading-relaxed mb-6">{artist.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">Role</h3>
                      <p className="text-muted-foreground">{artist.role}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Expertise</h3>
                      <p className="text-muted-foreground">{artist.genre}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Social Tab */}
          <TabsContent value="social">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Social & Connect</h2>
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Followers</span>
                      <span className="text-lg font-bold text-primary">{artist.followers?.toLocaleString()}</span>
                    </div>
                    <div className="pt-4 border-t">
                      <h3 className="font-semibold mb-4">Follow on Social Media</h3>
                      <div className="flex flex-wrap gap-3">
                        {artist.socialLinks?.twitter && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={artist.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                              Twitter
                            </a>
                          </Button>
                        )}
                        {artist.socialLinks?.instagram && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={artist.socialLinks.instagram} target="_blank" rel="noopener noreferrer">
                              Instagram
                            </a>
                          </Button>
                        )}
                        {artist.socialLinks?.youtube && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={artist.socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                              YouTube
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Related Artists Tab */}
          <TabsContent value="related">
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">Similar Artists</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {otherArtists.map((relatedArtist) => (
                  <Link key={relatedArtist.id} href={`/artists/${relatedArtist.id}`}>
                    <Card className="h-full hover:shadow-lg transition-all duration-300 hover:border-primary cursor-pointer overflow-hidden">
                      <div className="aspect-square bg-muted overflow-hidden relative group">
                        <img
                          src={relatedArtist.image || "/placeholder.svg"}
                          alt={relatedArtist.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{relatedArtist.name}</h3>
                          {relatedArtist.verified && <CheckCircle2 size={16} className="text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{relatedArtist.role}</p>
                        <Badge className="bg-primary">{relatedArtist.genre}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
