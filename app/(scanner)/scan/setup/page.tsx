"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import {
  loadDeviceId,
  loadDeviceName,
  loadSelectedEvent,
  saveDeviceId,
  saveDeviceName,
  saveDeviceSession,
  saveSelectedEvent,
  type SelectedScannerEvent,
} from "@/lib/scanner/session-store"

interface AssignedEvent {
  id: string
  title: string
  starts_at: string | null
  venue_name: string | null
}

const selectClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {[1, 2, 3].map((s) => {
        const complete = s < step
        const current = s === step
        return (
          <div key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-full font-mono text-[12px] font-bold",
                complete || current ? "bg-accent text-white" : "border border-line-2 text-ink-3",
              )}
            >
              {complete ? <Icon name="check" size={14} /> : s}
            </span>
            {s < 3 && <span className={cn("h-px w-12", s < step ? "bg-accent" : "bg-line")} />}
          </div>
        )
      })}
    </div>
  )
}

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-h2">{title}</h2>
      <p className="text-[13px] text-ink-3">{description}</p>
    </div>
  )
}

function formatStarts(value: string | null): string {
  if (!value) return ""
  try {
    return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  } catch {
    return value
  }
}

export default function ScannerSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [deviceName, setDeviceName] = useState("")
  const [eventId, setEventId] = useState("")
  const [events, setEvents] = useState<AssignedEvent[] | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [deviceId, setDeviceId] = useState("device-…")
  const [setupCode, setSetupCode] = useState("")
  const [claimingCode, setClaimingCode] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)

  // Restore any previously-persisted setup so the staff member doesn't
  // have to retype things between shift breaks or page reloads.
  useEffect(() => {
    setDeviceId(loadDeviceId())
    const existingName = loadDeviceName()
    if (existingName) setDeviceName(existingName)
    const existingEvent = loadSelectedEvent()
    if (existingEvent) setEventId(existingEvent.id)
  }, [])

  // Lazy-load the events list when the user advances past step 1 — keeps
  // the initial paint cheap when the device is being unboxed.
  useEffect(() => {
    if (step < 2 || events !== null) return
    let cancelled = false
    fetch("/api/scanner/events", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load events")
        const data = (await response.json()) as { events: AssignedEvent[] }
        if (!cancelled) setEvents(data.events ?? [])
      })
      .catch((error) => {
        if (!cancelled) setEventsError(error?.message ?? "Unable to load events")
      })
    return () => {
      cancelled = true
    }
  }, [step, events])

  const selectedEvent = events?.find((event) => event.id === eventId) ?? null

  const handleClaimSetupCode = async () => {
    if (!setupCode.trim() || claimingCode) return
    setClaimingCode(true)
    setClaimError(null)

    try {
      const currentDeviceId = loadDeviceId()
      const response = await fetch("/api/scanner/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: setupCode,
          deviceId: currentDeviceId,
          label: deviceName.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error ?? "Unable to provision scanner device")

      const provisionedEvent: SelectedScannerEvent = {
        id: data.event.id,
        title: data.event.title,
        venueName: data.event.venue_name,
        startsAt: data.event.starts_at,
      }
      const provisionedName = (data.device.label ?? deviceName.trim()) || "Scanner device"

      saveDeviceId(data.device.id)
      saveDeviceName(provisionedName)
      saveSelectedEvent(provisionedEvent)
      saveDeviceSession({
        id: data.session.id,
        deviceId: data.device.id,
        eventId: data.event.id,
        startedAt: data.session.started_at,
        deviceBound: true,
      })

      router.push("/scan")
    } catch (error: any) {
      setClaimError(error?.message ?? "Unable to provision scanner device")
    } finally {
      setClaimingCode(false)
    }
  }

  const handleComplete = () => {
    saveDeviceName(deviceName.trim())
    if (selectedEvent) {
      const payload: SelectedScannerEvent = {
        id: selectedEvent.id,
        title: selectedEvent.title,
        venueName: selectedEvent.venue_name,
        startsAt: selectedEvent.starts_at,
      }
      saveSelectedEvent(payload)
    }
    router.push("/scan")
  }

  const stepOne = (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <StepHeader title="Name your device" description="Give this scanner device a recognisable name." />
        <FormField
          label="Device name"
          placeholder="e.g., Front gate scanner"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
        />
        <Button variant="primary" size="md" onClick={() => setStep(2)} disabled={!deviceName.trim()} block>
          Continue
        </Button>
      </CardBody>
    </Card>
  )

  const setupCodeCard = (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <StepHeader title="Use setup code" description="Provision this scanner for an event without a personal login." />
        <FormField
          label="Setup code"
          placeholder="ABC-123"
          value={setupCode}
          onChange={(e) => setSetupCode(e.target.value.toUpperCase())}
        />
        <Button
          variant="primary"
          size="md"
          onClick={handleClaimSetupCode}
          disabled={!setupCode.trim() || claimingCode}
          block
        >
          <Icon name="qr" size={14} />
          {claimingCode ? "Provisioning…" : "Provision device"}
        </Button>
        {claimError && (
          <>
            <CardDivider />
            <p role="alert" className="text-[13px] text-danger">{claimError}</p>
          </>
        )}
      </CardBody>
    </Card>
  )

  const stepTwo = (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <StepHeader
          title="Select event"
          description="Only events you've been assigned as scanner staff will appear here."
        />
        {eventsError ? (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-[13px] text-danger">
            {eventsError}
          </p>
        ) : events === null ? (
          <p className="text-[13px] text-ink-3">Loading events…</p>
        ) : events.length === 0 ? (
          <p className="rounded-md border border-line bg-bg px-3 py-3 text-[13px] text-ink-3">
            You are not on the scanner staff for any active event. Ask the organizer to add you to <em>Event staff</em>.
          </p>
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-label">Event</span>
            <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={selectClass}>
              <option value="">Select event…</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                  {event.starts_at ? ` · ${formatStarts(event.starts_at)}` : ""}
                </option>
              ))}
            </select>
            {selectedEvent?.venue_name && (
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-3">{selectedEvent.venue_name}</span>
            )}
          </label>
        )}
        <div className="flex gap-3">
          <Button variant="outline" size="md" onClick={() => setStep(1)} className="flex-1">
            Back
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setStep(3)}
            disabled={!eventId || !selectedEvent}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </CardBody>
    </Card>
  )

  const stepThree = (
    <Card>
      <CardBody className="flex flex-col gap-6">
        <StepHeader title="All set" description="Your scanner device is ready to use." />
        <div className="flex flex-col items-center gap-3 py-2">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="qr" size={28} />
          </span>
          <p className="text-h3">{deviceName}</p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Ready to scan tickets</p>
        </div>

        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-line bg-bg p-3 text-[12px]">
          <div className="flex justify-between gap-2">
            <span className="text-ink-3">Device ID</span>
            <span className="font-mono text-ink truncate">{deviceId}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-ink-3">Event</span>
            <span className="font-semibold text-ink truncate">{selectedEvent?.title ?? ""}</span>
          </div>
          {selectedEvent?.venue_name && (
            <div className="flex justify-between gap-2">
              <span className="text-ink-3">Venue</span>
              <span className="text-ink truncate">{selectedEvent.venue_name}</span>
            </div>
          )}
        </div>

        <Button variant="primary" size="md" onClick={handleComplete} block>
          <Icon name="qr" size={14} />
          Start scanning
        </Button>
      </CardBody>
    </Card>
  )

  return (
    <>
      {/* Mobile */}
      <div className="flex min-h-dvh flex-col lg:hidden">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
          <Link
            href="/scan"
            aria-label="Back to scanner"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={18} />
          </Link>
          <h1 className="text-h3">Scanner setup</h1>
        </header>

        <div className="flex flex-col gap-6 p-4">
          {setupCodeCard}
          <ProgressDots step={step} />
          {step === 1 && stepOne}
          {step === 2 && stepTwo}
          {step === 3 && stepThree}
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[600px] px-4 py-12 lg:block">
        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <h1 className="text-h1">Scanner setup</h1>
          <p className="text-[13px] text-ink-3">Configure your device for ticket scanning.</p>
        </div>
        <div className="mb-12 flex justify-center">
          <ProgressDots step={step} />
        </div>
        <div className="mb-6">
          {setupCodeCard}
        </div>
        {step === 1 && stepOne}
        {step === 2 && stepTwo}
        {step === 3 && stepThree}
      </div>
    </>
  )
}
