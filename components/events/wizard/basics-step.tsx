"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useState } from "react"
import type { EventFormData } from "@/app/(organizer)/events/new/page"

const CATEGORIES = ["Music", "Conference", "Sports", "Arts", "Food & Drink", "Nightlife", "Community", "Other"]

type BasicsStepProps = {
  formData: EventFormData
  setFormData: (data: EventFormData) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}

export function BasicsStep({ formData, setFormData, errors, setErrors }: BasicsStepProps) {
  const [tagInput, setTagInput] = useState("")

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      })
      setTagInput("")
    }
  }

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Event Basics</h2>
        <p className="text-sm text-muted-foreground">Start with the fundamental details of your event</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            Event Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g., Summer Music Festival 2024"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value })
              if (errors.title) setErrors({ ...errors, title: "" })
            }}
            className={errors.title ? "border-destructive" : ""}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="shortDescription">
            Short Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="shortDescription"
            placeholder="A brief summary that appears in event listings (max 200 characters)"
            value={formData.shortDescription}
            onChange={(e) => {
              setFormData({ ...formData, shortDescription: e.target.value })
              if (errors.shortDescription) setErrors({ ...errors, shortDescription: "" })
            }}
            maxLength={200}
            rows={3}
            className={errors.shortDescription ? "border-destructive" : ""}
          />
          <div className="flex items-center justify-between text-xs">
            {errors.shortDescription ? (
              <p className="text-destructive">{errors.shortDescription}</p>
            ) : (
              <span className="text-muted-foreground">{formData.shortDescription.length}/200 characters</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fullDescription">Full Description</Label>
          <Textarea
            id="fullDescription"
            placeholder="Detailed description of your event, schedule, what to expect, etc."
            value={formData.fullDescription}
            onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">This will be displayed on the event details page</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => {
              setFormData({ ...formData, category: value })
              if (errors.category) setErrors({ ...errors, category: "" })
            }}
          >
            <SelectTrigger className={errors.category ? "border-destructive" : ""}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="Add tags (e.g., outdoor, family-friendly)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddTag()
                }
              }}
            />
            <Button type="button" variant="outline" onClick={handleAddTag}>
              Add
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Tags help attendees find your event through search</p>
        </div>
      </div>
    </div>
  )
}
