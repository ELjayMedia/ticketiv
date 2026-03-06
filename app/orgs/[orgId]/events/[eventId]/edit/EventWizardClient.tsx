"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { useEventRealtime } from "@/hooks/use-event-realtime"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

import { BasicsStep } from "@/components/events/wizard/basics-step"
import { ScheduleStep } from "@/components/events/wizard/schedule-step"
import { VenueStep } from "@/components/events/wizard/venue-step"
import { MediaStep } from "@/components/events/wizard/media-step"
import { ReviewStep } from "@/components/events/wizard/review-step"

const steps = ["basics", "schedule", "venue", "media", "review"] as const

export default function EventWizardClient({
  orgId,
  eventId,
  initialEvent,
}: {
  orgId: string
  eventId: string
  initialEvent?: any
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const step = (searchParams.get("step") ?? "basics") as typeof steps[number]

  const [event, setEvent] = useState<any>(initialEvent || null)
  const [loading, setLoading] = useState(!initialEvent)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [wasPublished, setWasPublished] = useState(initialEvent?.status === "published")

  // Initial load (client)
  useEffect(() => {
    if (initialEvent) return // Skip if we have initial data from server

    let cancelled = false
    async function load() {
      setLoading(true)
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("org_id", orgId)
        .single()

      if (!cancelled) {
        if (error) setEvent(null)
        else {
          setEvent(data)
          setWasPublished(data?.status === "published")
        }
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orgId, eventId, initialEvent])

  // Realtime merge
  const onRealtimeChange = useCallback(
    (payload: any) => {
      if (payload?.eventType === "UPDATE" || payload?.eventType === "INSERT") {
        const newEvent = { ...(event ?? {}), ...(payload.new ?? {}) }

        // Detect publish status change and show toast
        if (event?.status !== "published" && newEvent.status === "published" && !wasPublished) {
          toast({
            title: "Event published!",
            description: "Your event is now visible to everyone.",
            duration: 5000,
          })
          setWasPublished(true)
        }

        setEvent(newEvent)
        setSaveState("saved")
        setTimeout(() => setSaveState("idle"), 1000)
      }
    },
    [event, wasPublished, toast]
  )

  useEventRealtime({ eventId, onChange: onRealtimeChange })

  function go(nextStep: typeof steps[number]) {
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=${nextStep}`)
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!event) return <div className="p-6">No access or event not found.</div>

  const isDraft = event?.status === "draft"

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-semibold">{event.title ?? "Untitled event"}</h1>
            {isDraft && <Badge variant="outline">Draft</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {steps.map((s) => (
          <button
            key={s}
            onClick={() => go(s)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              s === step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="border rounded-xl p-4">
        {step === "basics" && (
          <BasicsStep event={event} onSaving={() => setSaveState("saving")} onError={() => setSaveState("error")} />
        )}
        {step === "schedule" && (
          <ScheduleStep event={event} onSaving={() => setSaveState("saving")} onError={() => setSaveState("error")} />
        )}
        {step === "venue" && (
          <VenueStep event={event} onSaving={() => setSaveState("saving")} onError={() => setSaveState("error")} />
        )}
        {step === "media" && (
          <MediaStep event={event} onSaving={() => setSaveState("saving")} onError={() => setSaveState("error")} />
        )}
        {step === "review" && (
          <ReviewStep
            event={event}
            onSaving={() => setSaveState("saving")}
            onError={() => setSaveState("error")}
            onPublish={() => setWasPublished(true)}
          />
        )}
      </div>
    </div>
  )
}
