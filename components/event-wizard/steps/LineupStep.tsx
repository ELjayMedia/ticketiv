"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Plus, Search, Trash2, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type ArtistProfile = {
  id: string
  name: string
  slug: string
  bio: string | null
  image_url: string | null
  is_claimed: boolean
}

type LineupItem = {
  event_id: string
  artist_id: string
  role: string | null
  artists: ArtistProfile | null
}

type ArtistForm = {
  name: string
  role: string
  bio: string
  image_url: string
}

const EMPTY_ARTIST: ArtistForm = {
  name: "",
  role: "performer",
  bio: "",
  image_url: "",
}

export function LineupStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [lineup, setLineup] = useState<LineupItem[]>([])
  const [artist, setArtist] = useState<ArtistForm>(EMPTY_ARTIST)
  const [selectedArtist, setSelectedArtist] = useState<ArtistProfile | null>(null)
  const [suggestions, setSuggestions] = useState<ArtistProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    void loadLineup()
  }, [eventId])

  useEffect(() => {
    const query = artist.name.trim()
    if (selectedArtist || query.length < 2) {
      setSuggestions([])
      setSearching(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true)
        const response = await fetch(`/api/events/${eventId}/lineup?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || "Failed to search artist profiles")
        if (!cancelled) setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : [])
      } catch (searchError: any) {
        if (!cancelled) setError(searchError?.message || "Failed to search artist profiles")
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [artist.name, eventId, selectedArtist])

  const linkedArtistIds = useMemo(() => new Set(lineup.map((item) => item.artist_id)), [lineup])
  const exactMatch = suggestions.find(
    (suggestion) => suggestion.name.trim().toLocaleLowerCase() === artist.name.trim().toLocaleLowerCase(),
  )

  async function loadLineup() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/lineup`, { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load lineup")
      setLineup(Array.isArray(payload.lineup) ? payload.lineup : [])
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load lineup")
    } finally {
      setLoading(false)
    }
  }

  function updateName(name: string) {
    setArtist((current) => ({ ...current, name }))
    if (selectedArtist && name !== selectedArtist.name) setSelectedArtist(null)
    setError("")
  }

  function chooseArtist(profile: ArtistProfile) {
    setSelectedArtist(profile)
    setArtist((current) => ({
      ...current,
      name: profile.name,
      bio: profile.bio ?? current.bio,
      image_url: profile.image_url ?? current.image_url,
    }))
    setSuggestions([])
    setError("")
  }

  function clearSelection() {
    setSelectedArtist(null)
    setArtist((current) => ({ ...current, name: "", bio: "", image_url: "" }))
  }

  async function addArtist() {
    if (!artist.name.trim()) {
      setError("Artist name is required")
      return
    }

    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/lineup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...artist,
          artist_id: selectedArtist?.id ?? null,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to add lineup item")

      setArtist(EMPTY_ARTIST)
      setSelectedArtist(null)
      setSuggestions([])
      await loadLineup()
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to add lineup item")
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
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to remove lineup item")
      await loadLineup()
    } catch (removeError: any) {
      setError(removeError?.message || "Failed to remove lineup item")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading lineup…</div>

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Artist profiles are shared across Ticketiv. Search before creating a new one so every organiser can reuse the
        same profile. A performer does not need an account yet; the profile can be claimed after launch.
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Current lineup</h3>
          <Badge variant="outline">{lineup.length}</Badge>
        </div>

        {lineup.length === 0 ? (
          <p className="text-sm text-muted-foreground">No lineup added yet.</p>
        ) : (
          <div className="space-y-2">
            {lineup.map((item) => {
              const profile = item.artists
              return (
                <div
                  key={`${item.event_id}-${item.artist_id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {profile?.image_url ? (
                      <img
                        src={profile.image_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full border object-cover"
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{profile?.name || "Unnamed"}</p>
                        <Badge variant={profile?.is_claimed ? "default" : "secondary"}>
                          {profile?.is_claimed ? "Claimed" : "Unclaimed"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{item.role || "performer"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${profile?.name ?? "artist"} from lineup`}
                    disabled={saving}
                    onClick={() => void removeArtist(item.artist_id)}
                    className="rounded-md p-2 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t pt-5">
        <h3 className="font-medium">Add artist or featured guest</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select an existing profile or enter a new name. Exact duplicate names are automatically reused.
        </p>

        <div className="mt-4 space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label="Search or enter artist name"
              placeholder="Search or enter artist name"
              value={artist.name}
              onChange={(event) => updateName(event.target.value)}
              className="pl-9"
              disabled={saving}
              autoComplete="off"
            />

            {!selectedArtist && (searching || suggestions.length > 0) ? (
              <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-lg">
                {searching ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">Searching profiles…</p>
                ) : (
                  <div className="max-h-72 overflow-y-auto p-1">
                    {suggestions.map((profile) => {
                      const alreadyLinked = linkedArtistIds.has(profile.id)
                      return (
                        <button
                          type="button"
                          key={profile.id}
                          disabled={alreadyLinked}
                          onClick={() => chooseArtist(profile)}
                          className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-muted disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {profile.image_url ? (
                            <img src={profile.image_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                              <UserRound className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{profile.name}</span>
                              <Badge variant={profile.is_claimed ? "default" : "secondary"}>
                                {profile.is_claimed ? "Claimed" : "Unclaimed"}
                              </Badge>
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {alreadyLinked ? "Already on this lineup" : profile.bio || "Reusable Ticketiv artist profile"}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {selectedArtist ? (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 text-emerald-700" />
                <div>
                  <p className="text-sm font-medium">Using {selectedArtist.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Existing details stay protected. Missing bio or image fields can be filled below.
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection} disabled={saving}>
                Change
              </Button>
            </div>
          ) : artist.name.trim().length >= 2 && !searching && !exactMatch ? (
            <p className="text-xs text-muted-foreground">
              No exact profile selected. Adding this lineup item will create an unclaimed reusable artist profile, or
              reuse an exact normalized match if one already exists.
            </p>
          ) : null}

          <Input
            placeholder="Role, e.g. Headliner, DJ, Speaker"
            value={artist.role}
            onChange={(event) => setArtist((current) => ({ ...current, role: event.target.value }))}
            disabled={saving}
          />
          <Input
            placeholder="Image URL optional"
            value={artist.image_url}
            onChange={(event) => setArtist((current) => ({ ...current, image_url: event.target.value }))}
            disabled={saving}
          />
          <Textarea
            placeholder="Short bio optional"
            value={artist.bio}
            onChange={(event) => setArtist((current) => ({ ...current, bio: event.target.value }))}
            className="h-24"
            disabled={saving}
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button onClick={() => void addArtist()} disabled={saving || !artist.name.trim()} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {saving ? "Saving lineup…" : selectedArtist ? "Add existing profile to lineup" : "Add to lineup"}
          </Button>
        </div>
      </div>
    </div>
  )
}
