"use client"

import { useState, useMemo } from "react"
import { Search } from "lucide-react"

import { EventCard } from "@/components/events/event-card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import type { EventSummary } from "@/types"

interface BrowseClientProps {
  initialEvents: EventSummary[]
}

const CATEGORIES = [
  "All Categories",
  "Music",
  "Lifestyle",
  "Other Sport",
  "Soccer",
  "Comedy",
  "Rugby",
  "Cricket",
  "Hospitality",
  "Park and Ride",
  "Theatre",
]

const DATE_FILTERS = ["Any time", "Today", "This Weekend", "This Week", "This Month", "Next 30 Days"]

export default function BrowseClient({ initialEvents }: BrowseClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedDate, setSelectedDate] = useState("Any time")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")

  const locations = useMemo(() => {
    const locs = new Set<string>()
    initialEvents.forEach((event) => {
      if (event.location) locs.add(event.location)
    })
    return Array.from(locs).sort()
  }, [initialEvents])

  const filteredEvents = useMemo(() => {
    return initialEvents.filter((event) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Category filter
      if (selectedCategory !== "All Categories" && event.category !== selectedCategory) {
        return false
      }

      // Location filter
      if (selectedLocation !== "all" && event.location !== selectedLocation) {
        return false
      }

      // Price filter
      if (priceMin && event.minimum_price != null && event.minimum_price < Number.parseInt(priceMin)) {
        return false
      }
      if (priceMax && event.minimum_price != null && event.minimum_price > Number.parseInt(priceMax)) {
        return false
      }

      // Date filter
      if (selectedDate !== "Any time" && event.starts_at) {
        const eventDate = new Date(event.starts_at)
        const now = new Date()

        switch (selectedDate) {
          case "Today":
            if (eventDate.toDateString() !== now.toDateString()) return false
            break
          case "This Weekend": {
            const dayOfWeek = now.getDay()
            const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7
            const fridayStart = new Date(now)
            fridayStart.setDate(now.getDate() + daysUntilFriday)
            fridayStart.setHours(0, 0, 0, 0)
            const sundayEnd = new Date(fridayStart)
            sundayEnd.setDate(fridayStart.getDate() + 2)
            sundayEnd.setHours(23, 59, 59, 999)
            if (eventDate < fridayStart || eventDate > sundayEnd) return false
            break
          }
          case "This Week": {
            const weekStart = new Date(now)
            weekStart.setDate(now.getDate() - now.getDay())
            weekStart.setHours(0, 0, 0, 0)
            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekStart.getDate() + 6)
            weekEnd.setHours(23, 59, 59, 999)
            if (eventDate < weekStart || eventDate > weekEnd) return false
            break
          }
          case "This Month":
            if (eventDate.getMonth() !== now.getMonth() || eventDate.getFullYear() !== now.getFullYear()) return false
            break
          case "Next 30 Days": {
            const thirtyDaysLater = new Date(now)
            thirtyDaysLater.setDate(now.getDate() + 30)
            if (eventDate < now || eventDate > thirtyDaysLater) return false
            break
          }
        }
      }

      return true
    })
  }, [initialEvents, searchQuery, selectedCategory, selectedDate, selectedLocation, priceMin, priceMax])

  return (
    <div className="max-w-[980px] mx-auto px-4 sm:px-6 py-8 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 flex-shrink-0 space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-4">Filters</h2>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Categories</h3>
            <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
              {CATEGORIES.map((category) => (
                <div key={category} className="flex items-center space-x-2">
                  <RadioGroupItem value={category} id={category} />
                  <Label htmlFor={category} className="text-sm font-normal cursor-pointer">
                    {category}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Date</h3>
            <RadioGroup value={selectedDate} onValueChange={setSelectedDate}>
              {DATE_FILTERS.map((date) => (
                <div key={date} className="flex items-center space-x-2">
                  <RadioGroupItem value={date} id={date} />
                  <Label htmlFor={date} className="text-sm font-normal cursor-pointer">
                    {date}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Location</h3>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Price Range</h3>
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Min (R)"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="h-9"
              />
              <Input
                type="number"
                placeholder="Max (R)"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </aside>

        <main className="flex-1 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold">All Events</h1>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events, venues, or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {filteredEvents.length} of {initialEvents.length} events
              </p>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  Search: {searchQuery}
                </Badge>
              )}
            </div>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No events found matching your criteria.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
