"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function VenueStep({
  eventId,
  onSaving,
}: {
  eventId: string
  onSaving: () => void
}) {
  const [venueId, setVenueId] = useState("")
  const [venueName, setVenueName] = useState("")
  const [city, setCity] = useState("")
  const [address, setAddress] = useState("")
  const [capacity, setCapacity] = useState("")
  const [venues, setVenues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadVenueData()
  }, [eventId])

  const filteredVenues = useMemo(() => {
    const query = venueName.trim().toLowerCase()
    if (!query) return venues.slice(0, 10)

    return venues
      .filter((venue) => `${venue.name ?? ""} ${venue.city ?? ""} ${venue.address ?? ""}`.toLowerCase().includes(query))
      .slice(0, 10)
  }, [venues, venueName])

  async function loadVenueData() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/events/${eventId}/venue`, { cache: "no-store" })
      const payload = await response.json()

      if (!response.ok) throw new Error(payload.error || "Failed to load venues")

      setVenues(payload.venues ?? [])
      if (payload.currentVenue) {
        setVenueId(payload.currentVenue.id)
        setVenueName(payload.currentVenue.name ?? "")
        setCity(payload.currentVenue.city ?? "")
        setAddress(payload.currentVenue.address ?? "")
        setCapacity(payload.currentVenue.capacity == null ? "" : String(payload.currentVenue.capacity))
      }
    } catch (err: any) {
      console.error("[v0] Error loading venue data:", err)
      setError(err?.message || "Failed to load venue data")
    } finally {
      setLoading(false)
    }
  }

  function selectVenue(venue: any) {
    setVenueId(venue.id)
    setVenueName(venue.name ?? "")
    setCity(venue.city ?? "")
    setAddress(venue.address ?? "")
    setCapacity(venue.capacity == null ? "" : String(venue.capacity))
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
            : {
                name: venueName,
                city,
                address,
                capacity,
                tz: "Africa/Mbabane",
              },
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
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Type a venue name. Ticketiv will reuse an existing venue when the name and city match, or create one global venue record for future events.
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Venue name *</label>
        <Input
          value={venueName}
          onChange={(e) => {
            setVenueName(e.target.value)
            setVenueId("")
          }}
          placeholder="e.g. Mavuso Trade Centre"
          className="mt-2"
        />
      </div>

      {filteredVenues.length > 0 && !venueId && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Suggested existing venues</p>
          <div className="space-y-2">
            {filteredVenues.map((venue) => (
              <button
                key={venue.id}
                type="button"
                onClick={() => selectVenue(venue)}
                className="w-full rounded-lg border p-3 text-left text-sm transition hover:bg-accent"
              >
                <span className="block font-medium">{venue.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {[venue.city, venue.address].filter(Boolean).join(" • ") || "No location details yet"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">City</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Manzini" disabled={Boolean(venueId)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Capacity</label>
          <Input value={capacity} onChange={(e) => setCapacity(e.target.value)} type="number" placeholder="e.g. 5000" disabled={Boolean(venueId)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Address</label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address or area" disabled={Boolean(venueId)} />
      </div>

      {venueId && (
        <Button
          variant="outline"
          onClick={() => {
            setVenueId("")
            setVenueName("")
            setCity("")
            setAddress("")
            setCapacity("")
          }}
          className="w-full"
        >
          Use a different venue
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={saveVenue} disabled={saving || (!venueId && !venueName.trim())} className="w-full">
        {saving ? "Saving venue…" : "Save venue"}
      </Button>
    </div>
  )
}
