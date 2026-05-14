"use client"

import { useEffect, useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
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
  const [categoryLoading, setCategoryLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadCategories() {
      setCategoryLoading(true)
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from("event_categories")
        .select("id, name, slug, description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })

      if (!active) return

      if (error) {
        console.error("[v0] Error loading event categories:", error.message)
        setCategories([])
      } else {
        setCategories((data ?? []) as CategoryOption[])
      }
      setCategoryLoading(false)
    }

    loadCategories()
    return () => {
      active = false
    }
  }, [])

  async function save(nextCategory = category) {
    if (!title.trim()) {
      onError()
      return
    }

    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from("events")
        .update({ title, description, category: nextCategory || null })
        .eq("id", event.id)

      if (error) throw error
    } catch (err) {
      console.error("[v0] Error saving basics:", err)
      onError()
    }
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    save(value)
  }

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
        />
      </div>

      <div>
        <label className="text-sm font-medium">Category</label>
        <Select value={category || undefined} onValueChange={handleCategoryChange} disabled={categoryLoading || categories.length === 0}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder={categoryLoading ? "Loading categories..." : "Select a category"} />
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

      <Button onClick={() => save()} className="w-full">
        Save changes
      </Button>
    </div>
  )
}
