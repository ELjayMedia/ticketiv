"use client"

import type React from "react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mic2,
  Search,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react"

import { EventCardStandard } from "@/components/standardized/event-card-standard"
import type { EventCardData } from "@/components/standardized/event-card-standard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type HomeVenue = {
  id: string
  name: string
  city: string | null
  address: string | null
  capacity: number | null
}

type HomeArtist = {
  id: string
  name: string
  bio?: string | null
  avatar_url?: string | null
  genre?: string | null
  role?: string | null
}

interface HomeClientProps {
  initialEvents: EventCardData[]
  initialVenues: HomeVenue[]
  initialArtists: HomeArtist[]
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date TBA"

  return new Intl.DateTimeFormat("en-SZ", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function eventHref(event: EventCardData) {
  return `/events/${event.slug || event.id}`
}

function featuredImage(event: EventCardData) {
  return event.poster_url || "/placeholder.svg?height=720&width=1200"
}

export default function HomeClient({ initialEvents, initialVenues, initialArtists }: HomeClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [featuredIndex, setFeaturedIndex] = useState(0)

  const featuredEvents = useMemo(() => initialEvents.slice(0, 5), [initialEvents])
  const upcomingEvents = useMemo(() => initialEvents.slice(0, 12), [initialEvents])
  const activeFeatured = featuredEvents[featuredIndex] ?? featuredEvents[0]
  const hasEvents = initialEvents.length > 0

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()
    router.push(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse")
  }

  const moveFeatured = (direction: "previous" | "next") => {
    if (featuredEvents.length <= 1) return
    setFeaturedIndex((current) => {
      if (direction === "previous") return current === 0 ? featuredEvents.length - 1 : current - 1
      return current === featuredEvents.length - 1 ? 0 : current + 1
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden border-b border-border/70">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch lg:px-8 lg:py-12">
          <div className="flex flex-col justify-center rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
            <Badge variant="secondary" className="mb-5 w-fit gap-2 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" /> The home of events, tickets, and experiences
            </Badge>

            <h1 className="max-w-xl text-4xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Find the next experience worth showing up for.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Discover events, venues, artists and culture moments across Eswatini and Southern Africa — no account needed to browse.
            </p>

            <form onSubmit={handleSearch} className="mt-7 flex flex-col gap-3 rounded-2xl border border-border bg-background/80 p-2 shadow-sm sm:flex-row">
              <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search events, venues, artists…"
                  className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
              <Button type="submit" size="lg" className="rounded-xl">
                Explore <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>

            <div className="mt-7 grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl bg-muted/60 p-4">
                <CalendarDays className="mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{initialEvents.length}</p>
                <p className="text-xs text-muted-foreground">Events</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <MapPin className="mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{initialVenues.length}</p>
                <p className="text-xs text-muted-foreground">Venues</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-4">
                <Mic2 className="mb-2 h-5 w-5 text-primary" />
                <p className="text-2xl font-bold">{initialArtists.length}</p>
                <p className="text-xs text-muted-foreground">Artists</p>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            {activeFeatured ? (
              <div className="relative h-full min-h-[440px] overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
                <img
                  src={featuredImage(activeFeatured)}
                  alt={activeFeatured.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/5" />

                <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-3 sm:left-6 sm:right-6 sm:top-6">
                  <Badge className="rounded-full bg-background/90 text-foreground backdrop-blur">Featured event</Badge>
                  {featuredEvents.length > 1 && (
                    <div className="flex gap-2">
                      <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-background/90" onClick={() => moveFeatured("previous")}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-background/90" onClick={() => moveFeatured("next")}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
                  <p className="mb-2 flex items-center gap-2 text-sm text-white/80">
                    <CalendarDays className="h-4 w-4" /> {formatDate(activeFeatured.starts_at)}
                  </p>
                  <h2 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{activeFeatured.title}</h2>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/80">
                    <MapPin className="h-4 w-4" /> {activeFeatured.venue_name || activeFeatured.city || "Location TBA"}
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="rounded-xl">
                      <Link href={eventHref(activeFeatured)}>
                        View event <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary" className="rounded-xl bg-background/90 text-foreground hover:bg-background">
                      <Link href="/browse">Browse all events</Link>
                    </Button>
                  </div>
                </div>

                {featuredEvents.length > 1 && (
                  <div className="absolute bottom-5 right-5 hidden gap-2 sm:flex">
                    {featuredEvents.map((event, index) => (
                      <button
                        key={event.id}
                        className={cn("h-2 rounded-full transition-all", index === featuredIndex ? "w-8 bg-white" : "w-2 bg-white/50")}
                        onClick={() => setFeaturedIndex(index)}
                        aria-label={`Show featured event ${index + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[440px] flex-col items-center justify-center rounded-[2rem] border border-dashed bg-card p-8 text-center">
                <Ticket className="mb-4 h-10 w-10 text-muted-foreground" />
                <h2 className="text-2xl font-bold">No featured events yet</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">Once events are published, they will appear here for everyone to discover.</p>
                <Button asChild className="mt-6 rounded-xl">
                  <Link href="/host">Host an event</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1200px] space-y-12 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <section className="grid gap-3 sm:grid-cols-3">
          <Link href="/browse" className="group rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
            <CalendarDays className="mb-4 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Explore events</h3>
            <p className="mt-1 text-sm text-muted-foreground">Concerts, festivals, conferences and community experiences.</p>
          </Link>
          <Link href="/venues" className="group rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
            <MapPin className="mb-4 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Discover venues</h3>
            <p className="mt-1 text-sm text-muted-foreground">Find places hosting culture, business, sport and entertainment.</p>
          </Link>
          <Link href="/artists" className="group rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm">
            <Mic2 className="mb-4 h-6 w-6 text-primary" />
            <h3 className="font-semibold">Follow artists</h3>
            <p className="mt-1 text-sm text-muted-foreground">See performers, speakers and creators featured on events.</p>
          </Link>
        </section>

        <section>
          <SectionHeader title="Upcoming events" eyebrow="What’s happening" href="/browse" action="View all" />
          {hasEvents ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCardStandard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
          <div>
            <SectionHeader title="Venues to explore" eyebrow="Places" href="/venues" action="See venues" />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {initialVenues.length > 0 ? initialVenues.slice(0, 6).map((venue) => (
                <Card key={venue.id} className="overflow-hidden rounded-2xl bg-card/90">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 font-semibold">{venue.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{venue.city || venue.address || "Location TBA"}</p>
                      {venue.capacity != null && <p className="mt-2 text-xs text-muted-foreground">Capacity: {venue.capacity.toLocaleString("en-SZ")}</p>}
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="rounded-2xl border-dashed sm:col-span-2">
                  <CardContent className="p-6 text-sm text-muted-foreground">Venues will appear here once they are added.</CardContent>
                </Card>
              )}
            </div>
          </div>

          <div>
            <SectionHeader title="Artists & speakers" eyebrow="Lineup" href="/artists" action="See artists" />
            <div className="mt-5 grid gap-3">
              {initialArtists.length > 0 ? initialArtists.slice(0, 6).map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.id}`} className="flex items-center gap-4 rounded-2xl border bg-card/90 p-4 transition hover:border-primary/50 hover:shadow-sm">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 font-semibold">{artist.name}</h3>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{artist.genre || artist.role || "Featured talent"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )) : (
                <Card className="rounded-2xl border-dashed">
                  <CardContent className="p-6 text-sm text-muted-foreground">Artists and speakers will appear here once they are added.</CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border bg-card p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-4 rounded-full">For organisers</Badge>
              <h2 className="text-3xl font-bold tracking-tight">Create events. Sell tickets. Get paid.</h2>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Ticketiv gives organisers a public event page, ticket checkout, Paystack payments, QR tickets and check-in tools — while keeping discovery open to everyone.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" className="rounded-xl">
                <Link href="/host">Start hosting</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl">
                <Link href="/browse">View public events</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionHeader({ title, eyebrow, href, action }: { title: string; eyebrow: string; href: string; action: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <Button asChild variant="ghost" className="hidden rounded-xl sm:inline-flex">
        <Link href={href}>
          {action} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="mt-5 rounded-2xl border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <CalendarDays className="mb-4 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No public events yet</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">Published events will appear here for everyone to browse.</p>
        <Button asChild className="mt-6 rounded-xl">
          <Link href="/host">Host the first event</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
