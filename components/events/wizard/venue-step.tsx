"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { MapPin, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import type { EventFormData } from "@/app/(organizer)/events/new/page"

type VenueStepProps = {
  formData: EventFormData
  setFormData: (data: EventFormData) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}

type Venue = {
  id: string
  name: string
  address_line1: string
  city: string
  state: string
  capacity: number
}

export function VenueStep({ formData, setFormData, errors, setErrors }: VenueStepProps) {
  const [mode, setMode] = useState<"select" | "create">(formData.venue_id ? "select" : "create")
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const response = await fetch("/api/venues")
        if (response.ok) {
          const data = await response.json()
          setVenues(data.venues || [])
        }
      } catch (error) {
        console.error("[v0] Failed to fetch venues:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchVenues()
  }, [])

  const handleModeChange = (newMode: "select" | "create") => {
    setMode(newMode)
    if (newMode === "create") {
      setFormData({ ...formData, venue_id: null })
    } else {
      setFormData({ ...formData, newVenue: null })
    }
    // Clear venue errors
    const newErrors = { ...errors }
    delete newErrors.venue
    delete newErrors.venue_name
    delete newErrors.venue_city
    setErrors(newErrors)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Event Venue</h2>
        <p className="text-sm text-muted-foreground">Select an existing venue or create a new one</p>
      </div>

      <RadioGroup value={mode} onValueChange={(v) => handleModeChange(v as "select" | "create")}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="select" id="select" />
          <Label htmlFor="select" className="font-normal cursor-pointer">
            Select existing venue
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="create" id="create" />
          <Label htmlFor="create" className="font-normal cursor-pointer">
            Create new venue
          </Label>
        </div>
      </RadioGroup>

      {mode === "select" ? (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : venues.length === 0 ? (
            <Card className="p-6 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No venues found. Create your first venue below.</p>
              <Button variant="outline" onClick={() => setMode("create")} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Venue
              </Button>
            </Card>
          ) : (
            <Select
              value={formData.venue_id || undefined}
              onValueChange={(value) => {
                setFormData({ ...formData, venue_id: value })
                if (errors.venue) setErrors({ ...errors, venue: "" })
              }}
            >
              <SelectTrigger className={errors.venue ? "border-destructive" : ""}>
                <SelectValue placeholder="Select a venue" />
              </SelectTrigger>
              <SelectContent>
                {venues.map((venue) => (
                  <SelectItem key={venue.id} value={venue.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{venue.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {venue.city}, {venue.state} • Capacity: {venue.capacity?.toLocaleString() || "N/A"}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors.venue && <p className="text-xs text-destructive">{errors.venue}</p>}
        </div>
      ) : (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venue-name">
                Venue Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="venue-name"
                placeholder="e.g., Central Park Arena"
                value={formData.newVenue?.name || ""}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    newVenue: { ...(formData.newVenue || {}), name: e.target.value } as any,
                  })
                  if (errors.venue_name) setErrors({ ...errors, venue_name: "" })
                }}
                className={errors.venue_name ? "border-destructive" : ""}
              />
              {errors.venue_name && <p className="text-xs text-destructive">{errors.venue_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Street address"
                value={formData.newVenue?.address_line1 || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    newVenue: { ...(formData.newVenue || {}), address_line1: e.target.value } as any,
                  })
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">
                  City <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder="City"
                  value={formData.newVenue?.city || ""}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      newVenue: { ...(formData.newVenue || {}), city: e.target.value } as any,
                    })
                    if (errors.venue_city) setErrors({ ...errors, venue_city: "" })
                  }}
                  className={errors.venue_city ? "border-destructive" : ""}
                />
                {errors.venue_city && <p className="text-xs text-destructive">{errors.venue_city}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Region</Label>
                <Input
                  id="state"
                  placeholder="State or region"
                  value={formData.newVenue?.state || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newVenue: { ...(formData.newVenue || {}), state: e.target.value } as any,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  placeholder="Country"
                  value={formData.newVenue?.country || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newVenue: { ...(formData.newVenue || {}), country: e.target.value } as any,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postal">Postal Code</Label>
                <Input
                  id="postal"
                  placeholder="Postal code"
                  value={formData.newVenue?.postal_code || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      newVenue: { ...(formData.newVenue || {}), postal_code: e.target.value } as any,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Venue Capacity</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="Maximum attendees"
                value={formData.newVenue?.capacity || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    newVenue: {
                      ...(formData.newVenue || {}),
                      capacity: e.target.value ? Number.parseInt(e.target.value) : null,
                    } as any,
                  })
                }
              />
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
