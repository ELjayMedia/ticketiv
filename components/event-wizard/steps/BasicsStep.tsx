"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

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

  async function save() {
    if (!title.trim()) {
      onError()
      return
    }

    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from("events")
        .update({ title, description, category })
        .eq("id", event.id)

      if (error) throw error
    } catch (err) {
      console.error("[v0] Error saving basics:", err)
      onError()
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Event title *</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save}
          placeholder="e.g. Makoti Festival 2026"
          className="mt-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={save}
          placeholder="Tell attendees what this event is about..."
          className="mt-2 h-24"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={save}
          className="mt-2 w-full rounded-lg border px-3 py-2"
        >
          <option value="">Select a category</option>
          <option value="music">Music</option>
          <option value="sports">Sports</option>
          <option value="business">Business</option>
          <option value="conference">Conference</option>
          <option value="other">Other</option>
        </select>
      </div>

      <Button onClick={save} className="w-full">
        Save changes
      </Button>
    </div>
  )
}
