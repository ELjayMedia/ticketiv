"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plus, Trash2, Calendar } from "lucide-react"
import type { EventFormData } from "@/app/(organizer)/events/new/page"

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Australia/Sydney",
]

type ScheduleStepProps = {
  formData: EventFormData
  setFormData: (data: EventFormData) => void
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
}

export function ScheduleStep({ formData, setFormData, errors, setErrors }: ScheduleStepProps) {
  const addDate = () => {
    setFormData({
      ...formData,
      dates: [
        ...formData.dates,
        { starts_at: "", ends_at: "", timezone: formData.dates[0]?.timezone || "America/New_York" },
      ],
    })
  }

  const removeDate = (index: number) => {
    setFormData({
      ...formData,
      dates: formData.dates.filter((_, idx) => idx !== index),
    })
  }

  const updateDate = (index: number, field: "starts_at" | "ends_at" | "timezone", value: string) => {
    const newDates = [...formData.dates]
    newDates[index] = { ...newDates[index], [field]: value }
    setFormData({ ...formData, dates: newDates })

    // Clear errors for this field
    const errorKey = `date_${index}_${field === "starts_at" ? "start" : field === "ends_at" ? "end" : "tz"}`
    if (errors[errorKey]) {
      const newErrors = { ...errors }
      delete newErrors[errorKey]
      setErrors(newErrors)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Event Schedule</h2>
        <p className="text-sm text-muted-foreground">
          Add one or more dates for your event. For multi-day events, add a row for each day.
        </p>
      </div>

      <div className="space-y-4">
        {formData.dates.map((date, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">Date {index + 1}</h3>
              </div>
              {formData.dates.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDate(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`start-${index}`}>
                  Start Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`start-${index}`}
                  type="datetime-local"
                  value={date.starts_at}
                  onChange={(e) => updateDate(index, "starts_at", e.target.value)}
                  className={errors[`date_${index}_start`] ? "border-destructive" : ""}
                />
                {errors[`date_${index}_start`] && (
                  <p className="text-xs text-destructive">{errors[`date_${index}_start`]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`end-${index}`}>
                  End Date & Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`end-${index}`}
                  type="datetime-local"
                  value={date.ends_at}
                  onChange={(e) => updateDate(index, "ends_at", e.target.value)}
                  className={errors[`date_${index}_end`] ? "border-destructive" : ""}
                />
                {errors[`date_${index}_end`] && (
                  <p className="text-xs text-destructive">{errors[`date_${index}_end`]}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`tz-${index}`}>Timezone</Label>
                <Select value={date.timezone} onValueChange={(value) => updateDate(index, "timezone", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addDate} className="w-full bg-transparent">
          <Plus className="h-4 w-4 mr-2" />
          Add Another Date
        </Button>

        {errors.dates && <p className="text-xs text-destructive">{errors.dates}</p>}
      </div>
    </div>
  )
}
