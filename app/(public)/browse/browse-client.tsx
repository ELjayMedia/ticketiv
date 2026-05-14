"use client"

import { useState, useMemo } from "react"
import { SlidersHorizontal, X, Search, Zap } from "lucide-react"
import { SearchInput } from "@/components/ui/search-input"
import Link from "next/link"

import { EventCard } from "@/components/events/event-card"
import { NoEventsFound } from "@/components/ui/empty-states"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { EventSummary } from "@/types"
import type { EventCategoryOption } from "@/lib/data/event-categories"

interface BrowseClientProps {
  initialEvents: EventSummary[]
  categories: EventCategoryOption[]
}

const DATE_FILTERS = ["Any time", "Today", "This Weekend", "This Week", "This Month", "Next 30 Days"]

export default function BrowseClient({ initialEvents, categories }: BrowseClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedDate, setSelectedDate] = useState("Any time")
  const [selectedLocation, setSelectedLocation] = useState("all")
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")
  const [sortBy, setSortBy] = useState("date")

  const categoryOptions = useMemo(() => [{ name: "All Categories", slug: "all" }, ...categories], [categories])
  const categoryNameBySlug = useMemo(() => new Map(categories.map((category) => [category.slug, category.name])), [categories])

  const locations = useMemo(() => {
    const locs = new Set<string>()
    initialEvents.forEach((event) => {
      if (event.location) locs.add(event.location)
    })
    return Array.from(locs).sort()
  }, [initialEvents])

  const filteredEvents = useMemo(() => {
    const results = initialEvents.filter((event) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const categoryLabel = event.category ? categoryNameBySlug.get(event.category)?.toLowerCase() : ""
        const matchesSearch =
          event.title.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query) ||
          event.category?.toLowerCase().includes(query) ||
          categoryLabel?.includes(query)
        if (!matchesSearch) return false
      }

      if (selectedCategory !== "all" && event.category !== selectedCategory) return false
      if (selectedLocation !== "all" && event.location !== selectedLocation) return false
      if (priceMin && event.minimum_price != null && event.minimum_price < Number.parseInt(priceMin)) return false
      if (priceMax && event.minimum_price != null && event.minimum_price > Number.parseInt(priceMax)) return false

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

    if (sortBy === "date") {
      results.sort((a, b) => {
        const dateA = a.starts_at ? new Date(a.starts_at).getTime() : 0
        const dateB = b.starts_at ? new Date(b.starts_at).getTime() : 0
        return dateA - dateB
      })
    } else if (sortBy === "price-low") {
      results.sort((a, b) => (a.minimum_price ?? 0) - (b.minimum_price ?? 0))
    } else if (sortBy === "price-high") {
      results.sort((a, b) => (b.minimum_price ?? 0) - (a.minimum_price ?? 0))
    }

    return results
  }, [initialEvents, searchQuery, selectedCategory, selectedDate, selectedLocation, priceMin, priceMax, sortBy, categoryNameBySlug])

  const activeFilters = useMemo(() => {
    const filters: Array<{ label: string; onRemove: () => void }> = []
    if (selectedCategory !== "all") filters.push({ label: categoryNameBySlug.get(selectedCategory) ?? selectedCategory, onRemove: () => setSelectedCategory("all") })
    if (selectedDate !== "Any time") filters.push({ label: selectedDate, onRemove: () => setSelectedDate("Any time") })
    if (selectedLocation !== "all") filters.push({ label: selectedLocation, onRemove: () => setSelectedLocation("all") })
    if (priceMin) filters.push({ label: `Min: SZL ${priceMin}`, onRemove: () => setPriceMin("") })
    if (priceMax) filters.push({ label: `Max: SZL ${priceMax}`, onRemove: () => setPriceMax("") })
    return filters
  }, [selectedCategory, selectedDate, selectedLocation, priceMin, priceMax, categoryNameBySlug])

  const clearAllFilters = () => {
    setSelectedCategory("all")
    setSelectedDate("Any time")
    setSelectedLocation("all")
    setPriceMin("")
    setPriceMax("")
  }

  const renderEventCard = (event: EventSummary) => <EventCard key={event.id} event={event} categoryLabel={event.category ? categoryNameBySlug.get(event.category) ?? event.category : null} />

  return (
    <>
      <div className="lg:hidden px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" aria-label="Search events" />
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open filters">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6 overflow-y-auto h-[calc(85vh-80px)] pb-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Categories</h3>
                  <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                    {categoryOptions.map((category) => (
                      <div key={category.slug} className="flex items-center space-x-2">
                        <RadioGroupItem value={category.slug} id={`mobile-${category.slug}`} />
                        <Label htmlFor={`mobile-${category.slug}`} className="text-sm font-normal cursor-pointer">
                          {category.name}
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
                        <RadioGroupItem value={date} id={`mobile-date-${date}`} />
                        <Label htmlFor={`mobile-date-${date}`} className="text-sm font-normal cursor-pointer">
                          {date}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Location</h3>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger aria-label="Select location">
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
                    <Input type="number" placeholder="Min (SZL)" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} aria-label="Minimum price" />
                    <Input type="number" placeholder="Max (SZL)" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} aria-label="Maximum price" />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredEvents.length} event{filteredEvents.length !== 1 && "s"}
        </div>

        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground">Hosting an event?</h3>
              <p className="text-xs text-muted-foreground mt-1">Reach thousands of attendees with Ticketiv's simple ticketing platform.</p>
            </div>
          </div>
          <Button asChild size="sm" variant="default" className="w-full">
            <Link href="/create">Get Started</Link>
          </Button>
        </div>

        {filteredEvents.length > 0 ? <div className="space-y-4">{filteredEvents.map(renderEventCard)}</div> : <NoEventsFound />}
      </div>

      <div className="hidden lg:block max-w-[1200px] mx-auto py-0 px-6 pb-12 space-y-6">
        <div className="flex gap-6">
          <aside className="w-64 flex-shrink-0 space-y-6 sticky top-8 self-start">
            <div>
              <h2 className="text-lg font-bold mb-4">Filters</h2>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground">Hosting an event?</h3>
                  <p className="text-xs text-muted-foreground mt-1">Reach thousands of attendees with Ticketiv's simple ticketing platform.</p>
                </div>
              </div>
              <Button asChild size="sm" variant="default" className="w-full">
                <Link href="/create">Get Started</Link>
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Categories</h3>
              <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                {categoryOptions.map((category) => (
                  <div key={category.slug} className="flex items-center space-x-2">
                    <RadioGroupItem value={category.slug} id={category.slug} />
                    <Label htmlFor={category.slug} className="text-sm font-normal cursor-pointer">
                      {category.name}
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
                <SelectTrigger aria-label="Select location">
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
                <Input type="number" placeholder="Min (SZL)" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="h-9" aria-label="Minimum price" />
                <Input type="number" placeholder="Max (SZL)" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="h-9" aria-label="Maximum price" />
              </div>
            </div>
          </aside>

          <main className="flex-1 space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <SearchInput placeholder="Search events, venues, or artists..." value={searchQuery} onChange={setSearchQuery} />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Showing {filteredEvents.length} of {initialEvents.length} events</p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]" aria-label="Sort events">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(activeFilters.length > 0 || searchQuery) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Search: {searchQuery}
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={() => setSearchQuery("")} aria-label="Clear search">
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  )}
                  {activeFilters.map((filter, index) => (
                    <Badge key={index} variant="secondary" className="gap-1 pr-1">
                      {filter.label}
                      <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:bg-transparent" onClick={filter.onRemove} aria-label={`Remove ${filter.label} filter`}>
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                  {activeFilters.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7">
                      Clear all
                    </Button>
                  )}
                </div>
              )}
            </div>

            {filteredEvents.length > 0 ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 shadow-none">{filteredEvents.map(renderEventCard)}</div> : <NoEventsFound />}
          </main>
        </div>
      </div>
    </>
  )
}
