"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"

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
                complete || current ? "bg-accent text-white" : "border border-line-2 text-ink-3"
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

export default function ScannerSetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [deviceName, setDeviceName] = useState("")
  const [eventId, setEventId] = useState("")

  const handleComplete = () => {
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
        <Button variant="primary" size="md" onClick={() => setStep(2)} disabled={!deviceName} block>
          Continue
        </Button>
      </CardBody>
    </Card>
  )

  const stepTwo = (
    <Card>
      <CardBody className="flex flex-col gap-5">
        <StepHeader title="Select event" description="Choose which event you’ll be scanning tickets for." />
        <label className="flex flex-col gap-1">
          <span className="text-label">Event</span>
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} className={selectClass}>
            <option value="">Select event…</option>
            <option value="event1">AfroFest 2025</option>
            <option value="event2">Tech Summit</option>
            <option value="event3">Jazz Night</option>
          </select>
        </label>
        <div className="flex gap-3">
          <Button variant="outline" size="md" onClick={() => setStep(1)} className="flex-1">
            Back
          </Button>
          <Button variant="primary" size="md" onClick={() => setStep(3)} disabled={!eventId} className="flex-1">
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
          <div className="flex justify-between">
            <span className="text-ink-3">Device ID</span>
            <span className="font-mono text-ink">DEV-{Math.random().toString(36).substring(7).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">Event</span>
            <span className="font-semibold text-ink">AfroFest 2025</span>
          </div>
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
        {step === 1 && stepOne}
        {step === 2 && stepTwo}
        {step === 3 && stepThree}
      </div>
    </>
  )
}
