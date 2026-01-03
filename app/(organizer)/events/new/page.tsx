"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { BasicsStep } from "@/components/events/wizard/basics-step"
import { ScheduleStep } from "@/components/events/wizard/schedule-step"
import { VenueStep } from "@/components/events/wizard/venue-step"
import { MediaStep } from "@/components/events/wizard/media-step"
import { ReviewStep } from "@/components/events/wizard/review-step"

const STEPS = [
  { id: 1, name: "Basics", component: BasicsStep },
  { id: 2, name: "Schedule", component: ScheduleStep },
  { id: 3, name: "Venue", component: VenueStep },
  { id: 4, name: "Media", component: MediaStep },
  { id: 5, name: "Review & Publish", component: ReviewStep },
]

export type EventFormData = {
  title: string
  shortDescription: string
  fullDescription: string
  category: string
  tags: string[]
  dates: Array<{ starts_at: string; ends_at: string; timezone: string }>
  venue_id: string | null
  newVenue: {
    name: string
    address_line1: string
    city: string
    state: string
    country: string
    postal_code: string
    capacity: number | null
  } | null
  coverImageFile: File | null
  coverImageUrl: string | null
  isPublished: boolean
}

export default function CreateEventPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [draftId, setDraftId] = useState<string | null>(null)

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    shortDescription: "",
    fullDescription: "",
    category: "",
    tags: [],
    dates: [{ starts_at: "", ends_at: "", timezone: "America/New_York" }],
    venue_id: null,
    newVenue: null,
    coverImageFile: null,
    coverImageUrl: null,
    isPublished: false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.title.trim()) newErrors.title = "Title is required"
      if (!formData.shortDescription.trim()) newErrors.shortDescription = "Short description is required"
      if (!formData.category) newErrors.category = "Category is required"
    }

    if (step === 2) {
      if (formData.dates.length === 0) {
        newErrors.dates = "At least one date is required"
      } else {
        formData.dates.forEach((date, idx) => {
          if (!date.starts_at) newErrors[`date_${idx}_start`] = "Start time required"
          if (!date.ends_at) newErrors[`date_${idx}_end`] = "End time required"
        })
      }
    }

    if (step === 3) {
      if (!formData.venue_id && !formData.newVenue) {
        newErrors.venue = "Please select or create a venue"
      }
      if (formData.newVenue) {
        if (!formData.newVenue.name.trim()) newErrors.venue_name = "Venue name is required"
        if (!formData.newVenue.city.trim()) newErrors.venue_city = "City is required"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep(currentStep + 1)
      }
    } else {
      toast.error("Please fix the errors before continuing")
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          isPublished: false,
          draftId,
        }),
      })

      if (!response.ok) throw new Error("Failed to save draft")

      const data = await response.json()
      setDraftId(data.eventId)
      toast.success("Draft saved successfully")
    } catch (error) {
      console.error("[v0] Save draft error:", error)
      toast.error("Failed to save draft")
    } finally {
      setIsLoading(false)
    }
  }

  const handlePublish = async () => {
    if (!validateStep(5)) {
      toast.error("Please complete all required fields")
      return
    }

    setIsLoading(true)
    try {
      // Upload cover image first if present
      let coverImageUrl = formData.coverImageUrl
      if (formData.coverImageFile) {
        const uploadFormData = new FormData()
        uploadFormData.append("file", formData.coverImageFile)
        uploadFormData.append("bucket", "event-covers")

        const uploadResponse = await fetch("/api/uploads", {
          method: "POST",
          body: uploadFormData,
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          coverImageUrl = uploadData.url
        }
      }

      // Create/update event
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          coverImageUrl,
          isPublished: true,
          draftId,
        }),
      })

      if (!response.ok) throw new Error("Failed to publish event")

      const data = await response.json()
      toast.success("Event published successfully!")
      router.push(`/events/${data.eventId}`)
    } catch (error) {
      console.error("[v0] Publish error:", error)
      toast.error("Failed to publish event")
    } finally {
      setIsLoading(false)
    }
  }

  const CurrentStepComponent = STEPS[currentStep - 1].component
  const progress = (currentStep / STEPS.length) * 100

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile View */}
      <div className="lg:hidden">
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex items-center justify-between p-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Badge variant="outline">{STEPS[currentStep - 1].name}</Badge>
            <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          <Progress value={progress} className="h-1" />
        </div>

        <div className="p-4 space-y-6">
          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`h-2 w-2 rounded-full transition-all ${
                  step.id === currentStep ? "w-6 bg-primary" : step.id < currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <CurrentStepComponent formData={formData} setFormData={setFormData} errors={errors} setErrors={setErrors} />

          {/* Navigation */}
          <div className="flex gap-2 pt-4">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack} className="flex-1 bg-transparent">
                Back
              </Button>
            )}
            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} className="flex-1">
                Next
              </Button>
            ) : (
              <Button onClick={handlePublish} className="flex-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Publish Event
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block mx-auto max-w-[1000px] py-8 px-4">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create New Event</h1>
              <p className="text-muted-foreground mt-1">Fill in the details to create your event</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Draft
              </Button>
            </div>
          </div>

          {/* Progress Stepper */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {STEPS.map((step, idx) => (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        step.id < currentStep
                          ? "border-primary bg-primary text-primary-foreground"
                          : step.id === currentStep
                            ? "border-primary bg-background text-primary"
                            : "border-muted bg-background text-muted-foreground"
                      }`}
                    >
                      {step.id < currentStep ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{step.id}</span>
                      )}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 transition-all ${step.id < currentStep ? "bg-primary" : "bg-muted"}`}
                      />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      step.id === currentStep ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <Card>
            <CardContent className="p-8">
              <CurrentStepComponent
                formData={formData}
                setFormData={setFormData}
                errors={errors}
                setErrors={setErrors}
              />

              {/* Navigation */}
              <div className="flex justify-between gap-4 mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="w-32 bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>

                {currentStep < STEPS.length ? (
                  <Button onClick={handleNext} className="w-32">
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={handlePublish} disabled={isLoading} className="min-w-[160px]">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Publish Event
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
