"use client"

import type React from "react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  MapPin,
  Mic2,
  Search,
  Ticket,
  Users,
} from "lucide-react"

import { EventCardStandard } from "@/components/standardized/event-card-standard"
import type { EventCardData } from "@/components/standardized/event-card-standard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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

function priceLabel(event: EventCardData) {
  if (typeof event.min_price_cents !== "number") return "Tickets available"
  const amount = event.min_price_cents / 100
  return `From ${event.currency || "SZL"} ${amount.toLocaleString("en-SZ")}`
}

const quickCategories = ["Music", "Comedy", "Sport", "Festivals", "Business", "Family"]

export default function HomeClient({ initialEvents, initialVenues, initialArtists }: HomeClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const featuredEvents = useMemo(() => initialEvents.slice(0, 4), [initialEvents])
  const primaryFeatured = featuredEvents[0]
  const sideFeatured = featuredEvents.slice(1, 4)
  const upcomingEvents = useMemo(() => initialEvents.slice(0, 12), [initialEvents])
  const hasEvents = initialEvents.length > 0

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const query = searchQuery.trim()
    router.push(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse")
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-foreground text-background">
        <div className="mx-auto max-w-[1200px] px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Badge className="mb-3 bg-background/10 text-background hover:bg-background/15">Ticketiv marketplace</Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">Book tickets for events happening near you.</h1>
              <p className="mt-2 text-sm leading-6 text-background/75 sm:text-base">
                Browse public events, choose tickets, pay online, and use QR access at the gate.
              </p>
            </div>

            <form onSubmit={handleSearch} className="w-full max-w-xl rounded-full border border-background/15 bg-background p-1.5 shadow-sm lg:min-w-[480px]">
              <div className="flex items-center gap-2">
                <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by event, venue, artist or city"
                  className="h-10 flex-1 border-0 bg-transparent px-0 text-foreground shadow-none focus-visible:ring-0"
                />
                <Button type="submit" size="sm" className="px-5">
                  Search
                </Button>
              </div>
            </form>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {quickCategories.map((category) => (
              <Link
                key={category}
                href={`/browse?q=${encodeURIComponent(category)}`}
                className="rounded-full border border-background/15 px-3 py-1.5 text-xs font-medium text-background/85 transition hover:bg-background hover:text-foreground"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1200px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="grid gap-4 lg:grid-cols-[1.45fr_0.75fr]">
          {primaryFeatured ? (
            <Link href={eventHref(primaryFeatured)} className="group relative min-h-[320px] overflow-hidden rounded-lg border bg-card shadow-sm sm:min-h-[380px]">
              <img src={featuredImage(primaryFeatured)} alt={primaryFeatured.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <Badge className="bg-primary text-primary-foreground">Featured</Badge>
                <Badge className="bg-background/90 text-foreground">{priceLabel(primaryFeatured)}</Badge>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                <p className="mb-2 flex items-center gap-2 text-sm text-white/80">
                  <CalendarDays className="h-4 w-4" /> {formatDate(primaryFeatured.starts_at)}
                </p>
                <h2 className="max-w-3xl text-2xl font-bold leading-tight sm:text-4xl">{primaryFeatured.title}</h2>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/80">
                  <MapPin className="h-4 w-4" /> {primaryFeatured.venue_name || primaryFeatured.city || "Location TBA"}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-semibold text-foreground">
                  View event <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed bg-card p-8 text-center sm:min-h-[380px]">
              <Ticket className="mb-3 h-9 w-9 text-muted-foreground" />
              <h2 className="text-xl font-bold">No featured events yet</h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">Published events will appear here for everyone to discover.</p>
              <Button asChild className="mt-5">
                <Link href="/host">Host an event</Link>
              </Button>
            </div>
          )}

          <div className="grid gap-3">
            {sideFeatured.length > 0 ? sideFeatured.map((event) => (
              <Link key={event.id} href={eventHref(event)} className="group grid grid-cols-[116px_1fr] overflow-hidden rounded-lg border bg-card transition hover:border-primary/50 hover:shadow-sm">
                <div className="relative min-h-[112px] overflow-hidden bg-muted">
                  <img src={featuredImage(event)} alt={event.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="flex min-w-0 flex-col justify-between p-3">
                  <div>
                    <p className="text-xs font-medium text-primary">{formatDate(event.starts_at)}</p>
                    <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{event.title}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{event.venue_name || event.city || "Location TBA"}</p>
                  </div>
                  <p className="mt-2 text-xs font-semibold">{priceLabel(event)}</p>
                </div>
              </Link>
            )) : (
              <CompactPrompt />
            )}
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <StatsLink href="/browse" icon={<CalendarDays className="h-5 w-5" />} title="Events" value={initialEvents.length} description="Browse and buy tickets" />
          <StatsLink href="/venues" icon={<MapPin className="h-5 w-5" />} title="Venues" value={initialVenues.length} description="Discover event spaces" />
          <StatsLink href="/artists" icon={<Mic2 className="h-5 w-5" />} title="Artists" value={initialArtists.length} description="Find performers and speakers" />
        </section>

        <section>
          <SectionHeader title="Upcoming events" eyebrow="Tickets on sale" href="/browse" action="View all events" />
          {hasEvents ? (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              {upcomingEvents.map((event) => (
                <EventCardStandard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <SectionHeader title="Popular venues" eyebrow="Places" href="/venues" action="See venues" />
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {initialVenues.length > 0 ? initialVenues.slice(0, 6).map((venue) => (
                <Card key={venue.id} className="rounded-lg bg-card/95 shadow-none">
                  <CardContent className="flex items-start gap-3 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-1 text-sm font-semibold">{venue.name}</h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{venue.city || venue.address || "Location TBA"}</p>
                      {venue.capacity != null && <p className="mt-1 text-xs text-muted-foreground">Capacity: {venue.capacity.toLocaleString("en-SZ")}</p>}
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="rounded-lg border-dashed sm:col-span-2">
                  <CardContent className="p-5 text-sm text-muted-foreground">Venues will appear here once they are added.</CardContent>
                </Card>
              )}
            </div>
          </div>

          <div>
            <SectionHeader title="Artists & speakers" eyebrow="Lineup" href="/artists" action="See artists" />
            <div className="mt-4 grid gap-2">
              {initialArtists.length > 0 ? initialArtists.slice(0, 6).map((artist) => (
                <Link key={artist.id} href={`/artists/${artist.id}`} className="flex items-center gap-3 rounded-lg border bg-card/95 p-3 transition hover:border-primary/50 hover:shadow-sm">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted">
                    {artist.avatar_url ? (
                      <img src={artist.avatar_url} alt={artist.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary">
                        <Users className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-semibold">{artist.name}</h3>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{artist.genre || artist.role || "Featured talent"}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )) : (
                <Card className="rounded-lg border-dashed">
                  <CardContent className="p-5 text-sm text-muted-foreground">Artists and speakers will appear here once they are added.</CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border bg-card p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <Badge variant="secondary" className="mb-3">For organisers</Badge>
              <h2 className="text-2xl font-bold tracking-tight">Create events. Sell tickets. Scan guests.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Ticketiv supports public event pages, ticket tiers, online payments, QR tickets, transfers, venue listings and event check-in.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/host">Start hosting</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/browse">Browse events</Link>
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
    <div className="flex items-end justify-between gap-4 border-b pb-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h2 className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      </div>
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href={href}>
          {action} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}

function StatsLink({ href, icon, title, value, description }: { href: string; icon: React.ReactNode; title: string; value: number; description: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-lg border bg-card p-3 transition hover:border-primary/50 hover:shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{value} {title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}

function CompactPrompt() {
  return (
    <div className="rounded-lg border border-dashed bg-card p-5">
      <Ticket className="mb-3 h-7 w-7 text-muted-foreground" />
      <h3 className="font-semibold">More events loading soon</h3>
      <p className="mt-1 text-sm text-muted-foreground">Use the organiser tools to publish your first event.</p>
      <Button asChild size="sm" className="mt-4">
        <Link href="/host">Host event</Link>
      </Button>
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="mt-4 rounded-lg border-dashed">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <CalendarDays className="mb-3 h-9 w-9 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No public events yet</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">Published events will appear here for everyone to browse.</p>
        <Button asChild className="mt-5">
          <Link href="/host">Host the first event</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
