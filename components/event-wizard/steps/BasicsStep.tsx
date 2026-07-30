"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type CategoryOption = {
  id: string
  name: string
  slug: string
  description: string | null
}

type SaveOverrides = {
  category?: string
  coverImageUrl?: string
}

export function BasicsStep({
  event,
  onSaving,
  onError,
}: {
  event: any
  onSaving: () => void
  onError: () => void
}) {
  const [title, setTitle] = useState(event?.title ?? "")
  const [description, setDescription] = useState(event?.description ?? "")
  const [category, setCategory] = useState(event?.category ?? "")
  const [coverImageUrl, setCoverImageUrl] = useState(event?.cover_image_url ?? "")
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadBasics()
  }, [event?.id])

  async function loadBasics() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/events/${event.id}/basics`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load event basics")

      if (payload.event) {
        setTitle(payload.event.title ?? "")
        setDescription(payload.event.description ?? "")
        setCategory(payload.event.category ?? "")
        setCoverImageUrl(payload.event.cover_image_url ?? "")
      }
      setCategories(payload.categories ?? [])
    } catch (loadError: any) {
      console.error("[event-wizard] Error loading event basics:", loadError)
      setError(loadError?.message || "Failed to load event basics")
      onError()
    } finally {
      setLoading(false)
    }
  }

  async function save(overrides: SaveOverrides = {}) {
    const nextCategory = overrides.category ?? category
    const nextCoverImageUrl = overrides.coverImageUrl ?? coverImageUrl

    if (!title.trim()) {
      setError("Event title is required")
      onError()
      return false
    }

    try {
      setSaving(true)
      setError("")
      onSaving()

      const response = await fetch(`/api/events/${event.id}/basics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category: nextCategory || null,
          cover_image_url: nextCoverImageUrl || null,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save event basics")

      if (payload.event) {
        setTitle(payload.event.title ?? "")
        setDescription(payload.event.description ?? "")
        setCategory(payload.event.category ?? "")
        setCoverImageUrl(payload.event.cover_image_url ?? "")
      }
      return true
    } catch (saveError: any) {
      console.error("[event-wizard] Error saving basics:", saveError)
      setError(saveError?.message || "Failed to save event basics")
      onError()
      return false
    } finally {
      setSaving(false)
    }
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    void save({ category: value })
  }

  async function handleCoverUpload(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the event cover")
      onError()
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Cover images must be smaller than 8 MB")
      onError()
      return
    }

    try {
      setUploading(true)
      setError("")
      onSaving()

      const formData = new FormData()
      formData.append("file", file)
      formData.append("eventId", event.id)

      const uploadResponse = await fetch("/api/uploads", { method: "POST", body: formData })
      const uploadPayload = await uploadResponse.json().catch(() => ({}))
      if (!uploadResponse.ok || !uploadPayload.url) {
        throw new Error(uploadPayload.error || "Failed to upload cover image")
      }

      setCoverImageUrl(uploadPayload.url)
      await save({ coverImageUrl: uploadPayload.url })
    } catch (uploadError: any) {
      console.error("[event-wizard] Error uploading cover image:", uploadError)
      setError(uploadError?.message || "Failed to upload cover image")
      onError()
    } finally {
      setUploading(false)
    }
  }

  async function removeCoverImage() {
    setCoverImageUrl("")
    await save({ coverImageUrl: "" })
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading event basics…</div>

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Event basics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set the public identity and discovery details for this event.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Event title *</label>
        <Input
          value={title}
          onChange={(inputEvent) => setTitle(inputEvent.target.value)}
          onBlur={() => void save()}
          placeholder="e.g. Makoti Festival 2026"
          className="mt-2"
          disabled={saving || uploading}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(inputEvent) => setDescription(inputEvent.target.value)}
          onBlur={() => void save()}
          placeholder="Tell attendees what this event is about..."
          className="mt-2 h-24"
          disabled={saving || uploading}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Category *</label>
        <Select value={category || undefined} onValueChange={handleCategoryChange} disabled={saving || uploading || categories.length === 0}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder={categories.length === 0 ? "No active categories available" : "Select a category"} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((item) => (
              <SelectItem key={item.id} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-xs text-muted-foreground">
          Categories are managed by Ticketiv and determine where the event appears in discovery.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">Cover image *</label>
          <p className="mt-1 text-xs text-muted-foreground">
            Use a landscape image that remains clear on mobile. JPG, PNG or WebP up to 8 MB.
          </p>
        </div>

        {coverImageUrl ? (
          <div className="overflow-hidden rounded-lg border bg-muted">
            <img src={coverImageUrl} alt="Event cover preview" className="aspect-[16/9] w-full object-cover" />
          </div>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 text-center text-sm text-muted-foreground">
            No cover image uploaded yet
          </div>
        )}

        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(inputEvent) => {
            const file = inputEvent.target.files?.[0]
            void handleCoverUpload(file)
            inputEvent.target.value = ""
          }}
          disabled={saving || uploading}
        />

        {coverImageUrl ? (
          <Button type="button" variant="outline" onClick={() => void removeCoverImage()} disabled={saving || uploading}>
            Remove cover image
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button onClick={() => void save()} disabled={saving || uploading || !title.trim()} className="w-full">
        {uploading ? "Uploading cover…" : saving ? "Saving changes…" : "Save basics"}
      </Button>
    </div>
  )
}
