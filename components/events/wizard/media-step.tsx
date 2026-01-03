"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, X, ImageIcon } from "lucide-react"
import { useRef, useState } from "react"
import type { EventFormData } from "@/app/(organizer)/events/new/page"
import Image from "next/image"

type MediaStepProps = {
  formData: EventFormData
  setFormData: (data: EventFormData) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}

export function MediaStep({ formData, setFormData, errors }: MediaStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(formData.coverImageUrl)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB")
        return
      }

      setFormData({ ...formData, coverImageFile: file })

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemove = () => {
    setFormData({ ...formData, coverImageFile: null, coverImageUrl: null })
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Event Media</h2>
        <p className="text-sm text-muted-foreground">
          Upload a cover image for your event. This will be the main visual that attendees see.
        </p>
      </div>

      <div className="space-y-4">
        <Label>Cover Image (Optional)</Label>

        {preview ? (
          <Card className="relative overflow-hidden">
            <div className="aspect-video relative">
              <Image src={preview || "/placeholder.svg"} alt="Event cover preview" fill className="object-cover" />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </Card>
        ) : (
          <Card
            className="border-2 border-dashed hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-12 text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-1">Upload Cover Image</h3>
              <p className="text-sm text-muted-foreground mb-4">Click to browse or drag and drop</p>
              <p className="text-xs text-muted-foreground">Recommended: 1200x600px, PNG or JPG, max 5MB</p>
            </div>
          </Card>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Image Guidelines</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Use high-quality images that represent your event</li>
                <li>• Ensure text on the image is readable</li>
                <li>• Avoid overly busy or cluttered designs</li>
                <li>• Consider how it will look on both mobile and desktop</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
