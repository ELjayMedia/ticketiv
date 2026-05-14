"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, CheckCircle2, MapPin, Plus, RotateCcw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function VenueStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [venueId, setVenueId] = useState("")
  const [venueName, setVenueName] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [capacity, setCapacity] = useState("")
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadVenueData()
  }, [eventId])

  useEffect(() => {
    const query = venueName.trim()
    const timeout = window.setTimeout(() => {
      searchVenues(query)
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [venueName])

  const selectedVenue = useMemo(() => venues.find((venue) => venue.id === venueId), [venues, venueId])
  const showSuggestions = !venueId && venues.length > 0

  async function loadVenueData() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/venue`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load venues")

      setVenues(payload.venues ?? [])
      if (payload.currentVenue) selectVenue(payload.currentVenue, payload.venues ?? [])
    } catch (err: any) {
      console.error("[v0] Error loading venue data:", err)
      setError(err?.message || "Failed to load venue data")
    } finally {
      setLoading(false)
    }
  }

  async function searchVenues(query: string) {
    if (loading) return
    try {
      setSearching(true)
      const url = query ? `/api/events/${eventId}/venue?q=${encodeURIComponent(query)}` : `/api/events/${eventId}/venue`
      const response = await fetch(url, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to search venues")
      setVenues(payload.venues ?? [])
    } catch (err: any) {
      console.error("[v0] Error searching venues:", err)
    } finally {
      setSearching(false)
    }
  }

  function selectVenue(venue: any, venueList = venues) {
    setVenueId(venue.id)
    setVenueName(venue.name ?? "")
    setCity(venue.city ?? "")
    setAddress(venue.address ?? "")
    setCapacity(venue.capacity == null ? "" : String(venue.capacity))
    if (!venueList.some((item) => item.id === venue.id)) setVenues([venue, ...venueList])
  }

  function resetVenue() {
    setVenueId("")
    setVenueName("")
    setCity("")
    setAddress("")
    setCapacity("")
  }

  async function saveVenue() {
    if (!venueId && !venueName.trim()) {
      setError("Enter a venue name or select an existing venue")
      return
    }

    try {
      setSaving(true)
      setError("")
      onSaving()

      const response = await fetch(`/api/events/${eventId}/venue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          venueId
            ? { venue_id: venueId }
            : { name: venueName, city, address, capacity, tz: "Africa/Mbabane" },
        ),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save venue")
      selectVenue(payload.venue)
      await loadVenueData()
    } catch (err: any) {
      console.error("[v0] Error saving venue:", err)
      setError(err?.message || "Failed to save venue")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading venues…</div>

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Reusable venue setup</h3>
            <p className="mt-1 text-sm text-muted-foreground">Type a venue name to search existing venues. Select a match to reuse it, or keep typing and add city, address and capacity to create a reusable venue safely.</p>
          </div>
        </div>
      </div>

      {selectedVenue && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Selected existing venue</p>
              <p className="text-muted-foreground">{selectedVenue.name} {[selectedVenue.city, selectedVenue.address].filter(Boolean).join(" • ")}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Venue name *</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={venueName}
            onChange={(e) => {
              setVenueName(e.target.value)
              setVenueId("")
            }}
            placeholder="Start typing, e.g. Mavuso Trade Centre"
            className="pl-9"
            disabled={saving}
          />
        </div>
        {searching && <p className="text-xs text-muted-foreground">Searching venues…</p>}
      </div>

      {showSuggestions && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Suggested existing venues</p>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border bg-background p-2">
            {venues.map((venue) => (
              <button key={venue.id} type="button" onClick={() => selectVenue(venue)} className="w-full rounded-md p-3 text-left text-sm transition hover:bg-accent">
                <span className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-muted-foreground" />{venue.name}</span>
                <span className="mt-1 block pl-6 text-xs text-muted-foreground">{[venue.city, venue.address, venue.capacity ? `${venue.capacity} capacity` : null].filter(Boolean).join(" • ") || "No location details yet"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!venueId && venueName.trim() && (
        <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <div className="flex gap-2"><Plus className="mt-0.5 h-4 w-4" /><span>“{venueName.trim()}” will be created or safely reused if the same venue and city already exist.</span></div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Manzini" disabled={saving || Boolean(venueId)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Capacity</label>
          <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} type="number" min="0" placeholder="e.g. 5000" disabled={saving || Boolean(venueId)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address or area" disabled={saving || Boolean(venueId)} />
      </div>

      {venueId && (
        <Button variant="outline" onClick={resetVenue} className="w-full gap-2" disabled={saving}>
          <RotateCcw className="h-4 w-4" /> Use a different venue
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={saveVenue} disabled={saving || (!venueId && !venueName.trim())} className="w-full">
        {saving ? "Saving venue…" : venueId ? "Use selected venue" : "Create / reuse venue"}
      </Button>
    </div>
  )
}
