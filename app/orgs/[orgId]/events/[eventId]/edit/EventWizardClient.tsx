"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { EventReadinessPanel } from "@/components/event-wizard/EventReadinessPanel"
import { BasicsStep } from "@/components/event-wizard/steps/BasicsStep"
import { LineupStep } from "@/components/event-wizard/steps/LineupStep"
import { PoliciesStep } from "@/components/event-wizard/steps/PoliciesStep"
import { PublishStep } from "@/components/event-wizard/steps/PublishStep"
import { ScheduleStep } from "@/components/event-wizard/steps/ScheduleStep"
import { TicketsStep } from "@/components/event-wizard/steps/TicketsStep"
import { VenueStep } from "@/components/event-wizard/steps/VenueStep"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { useEventRealtime } from "@/hooks/use-event-realtime"
import styles from "./EventWizardClient.module.css"

// TICK-48 / TICK-361 — Event editor shell (Quiet UI)

const STEPS = [
  { key: "basics", label: "Basics" },
  { key: "lineup", label: "Lineup" },
  { key: "schedule", label: "Dates" },
  { key: "venue", label: "Venue" },
  { key: "tickets", label: "Tickets" },
  { key: "policies", label: "Payments & policies" },
  { key: "publish", label: "Publish" },
] as const

type StepKey = (typeof STEPS)[number]["key"]

type EditableEvent = {
  id: string
  org_id: string
  title: string | null
  status: string | null
  [key: string]: unknown
}

type EventChangePayload = {
  eventType?: string
  new?: Partial<EditableEvent>
}

function isStepKey(value: string): value is StepKey {
  return STEPS.some((step) => step.key === value)
}

export default function EventWizardClient({ orgId, eventId }: { orgId: string; eventId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedStep = searchParams?.get("step") ?? "basics"
  const step: StepKey = isStepKey(requestedStep) ? requestedStep : "basics"
  const currentStepIndex = STEPS.findIndex((wizardStep) => wizardStep.key === step)

  const [event, setEvent] = useState<EditableEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [readinessRefreshKey, setReadinessRefreshKey] = useState(0)
  const saveStateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readinessTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" })
        const payload = (await response.json().catch(() => ({}))) as { event?: EditableEvent }
        if (cancelled) return

        if (!response.ok || !payload.event || payload.event.org_id !== orgId) setEvent(null)
        else setEvent(payload.event)
      } catch {
        if (!cancelled) setEvent(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orgId, eventId])

  useEffect(() => {
    return () => {
      if (saveStateTimer.current) clearTimeout(saveStateTimer.current)
      if (readinessTimer.current) clearTimeout(readinessTimer.current)
    }
  }, [])

  const onRealtimeChange = useCallback((payload: EventChangePayload) => {
    if (payload?.eventType === "UPDATE" || payload?.eventType === "INSERT") {
      setEvent((previous) => (previous ? { ...previous, ...(payload.new ?? {}) } : previous))
      setSaveState("saved")
      setReadinessRefreshKey((previous) => previous + 1)
      if (saveStateTimer.current) clearTimeout(saveStateTimer.current)
      saveStateTimer.current = setTimeout(() => setSaveState("idle"), 1500)
    }
  }, [])

  useEventRealtime({ eventId, onChange: onRealtimeChange })

  function go(next: StepKey) {
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=${next}`)
  }

  function handleSaving() {
    setSaveState("saving")
    if (readinessTimer.current) clearTimeout(readinessTimer.current)
    readinessTimer.current = setTimeout(() => {
      setReadinessRefreshKey((previous) => previous + 1)
    }, 600)
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center p-6">
        <p className="font-mono text-[12px] uppercase tracking-wider text-ink-3">Loading event setup…</p>
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
    <div className={`${styles.root} flex min-h-full flex-col bg-bg`}>
      <header className="border-b border-line bg-surface px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={`/orgs/${orgId}/events/${eventId}`}
                aria-label="Back to event dashboard"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink-3 transition-colors hover:border-line-2 hover:bg-bg hover:text-ink"
              >
                <Icon name="chevL" size={16} />
              </Link>
              <div className="min-w-0 flex flex-col gap-0.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Event setup</p>
                <h1 className="truncate text-[16px] font-semibold text-ink">{event.title ?? "Untitled event"}</h1>
                <p aria-live="polite" className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {event.status ?? "draft"}
                  {saveState === "saving" && " · Saving…"}
                  {saveState === "saved" && " · Saved"}
                  {saveState === "error" && " · Save failed"}
                </p>
              </div>
            </div>

            <Chip size="sm" variant="muted" className="shrink-0 font-mono uppercase tracking-wider">
              Step {currentStepIndex + 1} of {STEPS.length}
            </Chip>
          </div>

          <nav aria-label="Event setup steps" className="no-scrollbar -mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {STEPS.map((wizardStep, index) => {
              const current = wizardStep.key === step

              return (
                <button
                  key={wizardStep.key}
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => go(wizardStep.key)}
                  className={[
                    "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                    current
                      ? "border-ink bg-ink text-surface"
                      : "border-line-2 bg-surface text-ink-3 hover:bg-bg hover:text-ink",
                  ].join(" ")}
                >
                  <span className={`font-mono text-[10px] ${current ? "text-surface/70" : "text-ink-4"}`}>
                    {index + 1}
                  </span>
                  {wizardStep.label}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Card>
          <CardBody className="p-5 sm:p-6">
            {step === "basics" && (
              <BasicsStep event={event} onSaving={handleSaving} onError={() => setSaveState("error")} />
            )}
            {step === "lineup" && <LineupStep eventId={eventId} onSaving={handleSaving} />}
            {step === "schedule" && <ScheduleStep eventId={eventId} onSaving={handleSaving} />}
            {step === "venue" && <VenueStep eventId={eventId} onSaving={handleSaving} />}
            {step === "tickets" && <TicketsStep eventId={eventId} onSaving={handleSaving} />}
            {step === "policies" && <PoliciesStep eventId={eventId} onSaving={handleSaving} />}
            {step === "publish" && <PublishStep event={event} onSaving={handleSaving} />}
          </CardBody>
        </Card>

        <EventReadinessPanel orgId={orgId} eventId={eventId} refreshKey={readinessRefreshKey} />
      </main>
    </div>
  )
}
