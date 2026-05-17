"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useEventRealtime } from "@/hooks/use-event-realtime"

import { EventReadinessPanel } from "@/components/event-wizard/EventReadinessPanel"
import { BasicsStep } from "@/components/event-wizard/steps/BasicsStep"
import { VenueStep } from "@/components/event-wizard/steps/VenueStep"
import { ScheduleStep } from "@/components/event-wizard/steps/ScheduleStep"
import { TicketsStep } from "@/components/event-wizard/steps/TicketsStep"
import { PublishStep } from "@/components/event-wizard/steps/PublishStep"

// Lineup, Policies and Operations are managed post-publish on the event
// management page — they are intentionally absent from the creation wizard.
const steps = ["basics", "schedule", "venue", "tickets", "publish"] as const

export default function EventWizardClient({ orgId, eventId }: { orgId: string; eventId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = searchParams.get("step") ?? "basics"

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [readinessRefreshKey, setReadinessRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" })
      const payload = await response.json().catch(() => ({}))
      if (!cancelled) {
        if (!response.ok || !payload.event || payload.event.org_id !== orgId) setEvent(null)
        else setEvent(payload.event)
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orgId, eventId])

  const onRealtimeChange = useCallback((payload: any) => {
    if (payload?.eventType === "UPDATE" || payload?.eventType === "INSERT") {
      setEvent((prev: any) => ({ ...(prev ?? {}), ...(payload.new ?? {}) }))
      setSaveState("saved")
      setReadinessRefreshKey((prev) => prev + 1)
      setTimeout(() => setSaveState("idle"), 1000)
    }
  }, [])

  useEventRealtime({ eventId, onChange: onRealtimeChange })

  function go(next: string) {
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=${next}`)
  }

  function handleSaving() {
    setSaveState("saving")
    setTimeout(() => {
      setReadinessRefreshKey((prev) => prev + 1)
    }, 600)
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!event) return <div className="p-6">No access or event not found.</div>

  return (
    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">{event.title ?? "Untitled event"}</h1>
            <p className="text-sm text-muted-foreground">
              Status: {event.status ?? "draft"} {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {steps.map((s) => (
            <button key={s} onClick={() => go(s)} className={`rounded-full px-4 py-2 text-sm transition ${s === step ? "bg-black text-white" : "bg-muted hover:bg-muted/80"}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border bg-background p-4 shadow-sm">
          {step === "basics" && <BasicsStep event={event} onSaving={handleSaving} onError={() => setSaveState("error")} />}
          {step === "schedule" && <ScheduleStep eventId={eventId} onSaving={handleSaving} />}
          {step === "venue" && <VenueStep eventId={eventId} onSaving={handleSaving} />}
          {step === "tickets" && <TicketsStep eventId={eventId} onSaving={handleSaving} />}
          {step === "publish" && <PublishStep event={event} onSaving={handleSaving} />}
        </div>
      </div>

      <EventReadinessPanel eventId={eventId} refreshKey={readinessRefreshKey} />
    </div>
  )
}
