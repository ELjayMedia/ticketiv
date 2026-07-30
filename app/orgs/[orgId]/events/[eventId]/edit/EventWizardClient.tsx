"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { EventReadinessPanel } from "@/components/event-wizard/EventReadinessPanel"
import { BasicsStep } from "@/components/event-wizard/steps/BasicsStep"
import { PoliciesStep } from "@/components/event-wizard/steps/PoliciesStep"
import { PublishStep } from "@/components/event-wizard/steps/PublishStep"
import { ScheduleStep } from "@/components/event-wizard/steps/ScheduleStep"
import { TicketsStep } from "@/components/event-wizard/steps/TicketsStep"
import { VenueStep } from "@/components/event-wizard/steps/VenueStep"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { useEventRealtime } from "@/hooks/use-event-realtime"

// TICK-48 — Event editor shell (Quiet UI)

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "schedule", label: "Dates" },
  { key: "venue", label: "Venue" },
  { key: "tickets", label: "Tickets" },
  { key: "policies", label: "Payments & policies" },
  { key: "publish", label: "Publish" },
] as const

type StepKey = (typeof STEPS)[number]["key"]

function isStepKey(value: string): value is StepKey {
  return STEPS.some((step) => step.key === value)
}

export default function EventWizardClient({ orgId, eventId }: { orgId: string; eventId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedStep = searchParams?.get("step") ?? "basics"
  const step: StepKey = isStepKey(requestedStep) ? requestedStep : "basics"

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
      setEvent((previous: any) => ({ ...(previous ?? {}), ...(payload.new ?? {}) }))
      setSaveState("saved")
      setReadinessRefreshKey((previous) => previous + 1)
      setTimeout(() => setSaveState("idle"), 1500)
    }
  }, [])

  useEventRealtime({ eventId, onChange: onRealtimeChange })

  function go(next: StepKey) {
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=${next}`)
  }

  function handleSaving() {
    setSaveState("saving")
    setTimeout(() => {
      setReadinessRefreshKey((previous) => previous + 1)
    }, 600)
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-6">
        <p className="font-mono text-[12px] uppercase tracking-wider text-ink-3">Loading…</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Card className="border-danger/30">
          <CardBody className="flex flex-col gap-2 p-5">
            <h2 className="text-h2">Access denied</h2>
            <p className="text-[13px] text-ink-3">Event not found or you don't have permission to edit it.</p>
            <Link href={`/orgs/${orgId}/events`} className="text-[13px] text-accent underline-offset-4 hover:underline">
              Back to events
            </Link>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0">
      <div className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/orgs/${orgId}/events/${eventId}`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
            >
              <Icon name="chevL" size={16} />
            </Link>
            <div className="min-w-0 flex flex-col gap-0.5">
              <h1 className="truncate text-[15px] font-semibold text-ink">{event.title ?? "Untitled event"}</h1>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                {event.status ?? "draft"}
                {saveState === "saving" && " · Saving…"}
                {saveState === "saved" && " · Saved"}
                {saveState === "error" && " · Save failed"}
              </p>
            </div>
          </div>

          <div className="-mx-1 flex max-w-full gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:pb-0">
            {STEPS.map((wizardStep) => (
              <button
                key={wizardStep.key}
                type="button"
                onClick={() => go(wizardStep.key)}
                className={[
                  "shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
                  wizardStep.key === step
                    ? "bg-ink text-surface"
                    : "border border-line-2 text-ink-3 hover:bg-bg hover:text-ink",
                ].join(" ")}
              >
                {wizardStep.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="space-y-0">
          <Card>
            <CardBody className="p-5">
              {step === "basics" && (
                <BasicsStep event={event} onSaving={handleSaving} onError={() => setSaveState("error")} />
              )}
              {step === "schedule" && <ScheduleStep eventId={eventId} onSaving={handleSaving} />}
              {step === "venue" && <VenueStep eventId={eventId} onSaving={handleSaving} />}
              {step === "tickets" && <TicketsStep eventId={eventId} onSaving={handleSaving} />}
              {step === "policies" && <PoliciesStep eventId={eventId} onSaving={handleSaving} />}
              {step === "publish" && <PublishStep event={event} onSaving={handleSaving} />}
            </CardBody>
          </Card>
        </div>

        <EventReadinessPanel orgId={orgId} eventId={eventId} refreshKey={readinessRefreshKey} />
      </div>
    </div>
  )
}
