"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"

export function LineupStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [lineup, setLineup] = useState<any[]>([])
  const [artist, setArtist] = useState({ name: "", role: "performer", bio: "", image_url: "" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadLineup()
  }, [eventId])

  async function loadLineup() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/lineup`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load lineup")
      setLineup(payload.lineup || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load lineup")
    } finally {
      setLoading(false)
    }
  }

  async function addArtist() {
    if (!artist.name.trim()) return setError("Name is required")
    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(artist),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to add lineup item")
      setArtist({ name: "", role: "performer", bio: "", image_url: "" })
      await loadLineup()
    } catch (err: any) {
      setError(err?.message || "Failed to add lineup item")
    } finally {
      setSaving(false)
    }
  }

  async function removeArtist(artistId: string) {
    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/lineup/${artistId}`, { method: "DELETE" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to remove lineup item")
      await loadLineup()
    } catch (err: any) {
      setError(err?.message || "Failed to remove lineup item")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading lineup...</div>

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Add performers, speakers, worship leaders, DJs, comedians or other featured people for this event.
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Current lineup</h3>
        {lineup.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lineup added yet.</p>
        ) : (
          <div className="space-y-2">
            {lineup.map((item) => {
              const person = Array.isArray(item.artists) ? item.artists[0] : item.artists
              return (
                <div key={`${item.event_id}-${item.artist_id}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{person?.name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground">{item.role || "performer"}</p>
                  </div>
                  <button disabled={saving} onClick={() => removeArtist(item.artist_id)} className="text-red-600 hover:text-red-700 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-3 font-medium">Add lineup item</h3>
        <div className="space-y-3">
          <Input placeholder="Name" value={artist.name} onChange={(e) => setArtist({ ...artist, name: e.target.value })} disabled={saving} />
          <Input placeholder="Role" value={artist.role} onChange={(e) => setArtist({ ...artist, role: e.target.value })} disabled={saving} />
          <Input placeholder="Image URL optional" value={artist.image_url} onChange={(e) => setArtist({ ...artist, image_url: e.target.value })} disabled={saving} />
          <Textarea placeholder="Short bio optional" value={artist.bio} onChange={(e) => setArtist({ ...artist, bio: e.target.value })} className="h-24" disabled={saving} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={addArtist} disabled={saving || !artist.name.trim()} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {saving ? "Saving lineup..." : "Add to lineup"}
          </Button>
        </div>
      </div>
    </div>
  )
}
