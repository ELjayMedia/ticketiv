"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function VenueStep({
  eventId,
  onSaving,
}: {
  eventId: string
  onSaving: () => void
}) {
  const [event, setEvent] = useState<any>(null)
  const [venueId, setVenueId] = useState("")
  const [venueName, setVenueName] = useState("")
  const [venues, setVenues] = useState<any[]>([])
  const [showNewVenue, setShowNewVenue] = useState(false)

  useEffect(() => {
    loadEvent()
    loadVenues()
  }, [eventId])

  async function loadEvent() {
    const supabase = createClientSupabaseClient()
    const { data } = await supabase
      .from("events")
      .select("venue_id")
      .eq("id", eventId)
      .single()

    if (data) {
      setVenueId(data.venue_id || "")
    }
  }

  async function loadVenues() {
    const supabase = createClientSupabaseClient()
    const { data } = await supabase.from("venues").select("id, name").order("name")

    setVenues(data || [])
  }

  async function saveVenue() {
    if (!venueId && !venueName.trim()) return

    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      if (showNewVenue && venueName.trim()) {
        const { data: newVenue, error: createError } = await supabase
          .from("venues")
          .insert({ name: venueName })
          .select("id")
          .single()

        if (createError) throw createError

        setVenueId(newVenue.id)
        setShowNewVenue(false)

        const { error: updateError } = await supabase
          .from("events")
          .update({ venue_id: newVenue.id })
          .eq("id", eventId)

        if (updateError) throw updateError
      } else if (venueId) {
        const { error } = await supabase
          .from("events")
          .update({ venue_id: venueId })
          .eq("id", eventId)

        if (error) throw error
      }
    } catch (err) {
      console.error("[v0] Error saving venue:", err)
    }
  }

  return (
    <div className="space-y-4">
      {!showNewVenue && (
        <div>
          <label className="text-sm font-medium">Select venue</label>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="mt-2 w-full rounded-lg border px-3 py-2"
          >
            <option value="">Choose a venue...</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {showNewVenue && (
        <div>
          <label className="text-sm font-medium">New venue name</label>
          <Input
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="e.g. Johannesburg Convention Centre"
            className="mt-2"
          />
        </div>
      )}

      <Button
        variant="outline"
        onClick={() => {
          setShowNewVenue(!showNewVenue)
          setVenueName("")
        }}
        className="w-full"
      >
        {showNewVenue ? "Select existing" : "Create new venue"}
      </Button>

      <Button onClick={saveVenue} className="w-full">
        Save venue
      </Button>
    </div>
  )
}
