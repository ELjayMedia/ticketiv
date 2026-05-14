"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type CategoryOption = {
  id: string
  name: string
  slug: string
  description: string | null
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
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      }
      setCategories(payload.categories ?? [])
    } catch (err: any) {
      console.error("[v0] Error loading event basics:", err)
      setError(err?.message || "Failed to load event basics")
      onError()
    } finally {
      setLoading(false)
    }
  }

  async function save(nextCategory = category) {
    if (!title.trim()) {
      setError("Event title is required")
      onError()
      return
    }

    try {
      setSaving(true)
      setError("")
      onSaving()

      const response = await fetch(`/api/events/${event.id}/basics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category: nextCategory || null }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save event basics")

      if (payload.event) {
        setTitle(payload.event.title ?? "")
        setDescription(payload.event.description ?? "")
        setCategory(payload.event.category ?? "")
      }
    } catch (err: any) {
      console.error("[v0] Error saving basics:", err)
      setError(err?.message || "Failed to save event basics")
      onError()
    } finally {
      setSaving(false)
    }
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    save(value)
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading event basics…</div>

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Event title *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save()}
          placeholder="e.g. Makoti Festival 2026"
          className="mt-2"
          disabled={saving}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => save()}
          placeholder="Tell attendees what this event is about..."
          className="mt-2 h-24"
          disabled={saving}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Category</label>
        <Select value={category || undefined} onValueChange={handleCategoryChange} disabled={saving || categories.length === 0}>
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
          Categories are managed by Ticketiv super admins and used for public event discovery.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={() => save()} disabled={saving || !title.trim()} className="w-full">
        {saving ? "Saving changes…" : "Save changes"}
      </Button>
    </div>
  )
}
