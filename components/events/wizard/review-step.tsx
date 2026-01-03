"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, MapPin, Tag, ImageIcon, Clock } from "lucide-react"
import type { EventFormData } from "@/app/(organizer)/events/new/page"
import Image from "next/image"

type ReviewStepProps = {
  formData: EventFormData
  setFormData: (data: EventFormData) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}

export function ReviewStep({ formData }: ReviewStepProps) {
  const formatDateTime = (datetime: string) => {
    if (!datetime) return "Not set"
    const date = new Date(datetime)
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const preview = formData.coverImageFile ? URL.createObjectURL(formData.coverImageFile) : formData.coverImageUrl

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Review & Publish</h2>
        <p className="text-sm text-muted-foreground">
          Review your event details before publishing. You can always edit this later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-2xl">{formData.title || "Untitled Event"}</CardTitle>
            <Badge>{formData.category || "Uncategorized"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {preview && (
            <div className="aspect-video relative rounded-lg overflow-hidden border">
              <Image src={preview || "/placeholder.svg"} alt="Event cover" fill className="object-cover" />
            </div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Description
              </h3>
              <p className="text-sm text-muted-foreground">{formData.shortDescription || "No description provided"}</p>
              {formData.fullDescription && (
                <p className="text-sm text-muted-foreground mt-2">{formData.fullDescription}</p>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule ({formData.dates.length} {formData.dates.length === 1 ? "date" : "dates"})
              </h3>
              <div className="space-y-3">
                {formData.dates.map((date, idx) => (
                  <Card key={idx} className="p-3 bg-muted/30">
                    <div className="flex items-start gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 text-sm space-y-1">
                        <div>
                          <span className="font-medium">Start:</span> {formatDateTime(date.starts_at)}
                        </div>
                        <div>
                          <span className="font-medium">End:</span> {formatDateTime(date.ends_at)}
                        </div>
                        <div className="text-muted-foreground">Timezone: {date.timezone}</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Venue
              </h3>
              {formData.venue_id ? (
                <p className="text-sm text-muted-foreground">Existing venue selected (ID: {formData.venue_id})</p>
              ) : formData.newVenue ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium">{formData.newVenue.name}</p>
                  <p className="text-muted-foreground">
                    {[
                      formData.newVenue.address_line1,
                      formData.newVenue.city,
                      formData.newVenue.state,
                      formData.newVenue.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {formData.newVenue.capacity && (
                    <p className="text-muted-foreground">Capacity: {formData.newVenue.capacity.toLocaleString()}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No venue selected</p>
              )}
            </div>

            {formData.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!preview && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <ImageIcon className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700 dark:text-amber-400">No cover image</p>
                <p className="text-muted-foreground mt-1">
                  Consider adding a cover image to make your event more appealing to attendees.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
