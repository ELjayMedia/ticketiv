import Link from "next/link"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { getNextOrganizerSetupStep } from "@/lib/data/organizer/readiness"

export interface OnboardingStep {
  id: string
  title: string
  description: string
  href: string
  done: boolean
}

interface OnboardingChecklistProps {
  orgId: string
  steps: OnboardingStep[]
}

export function OnboardingChecklist({ orgId, steps }: OnboardingChecklistProps) {
  const doneCount = steps.filter((s) => s.done).length
  const total = steps.length
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0
  const allDone = doneCount === total
  const nextStep = getNextOrganizerSetupStep(steps)

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 p-5">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              {doneCount} of {total} complete
            </p>
            {allDone && (
              <span className="font-mono text-[11px] uppercase tracking-wider text-accent">
                All done
              </span>
            )}
          </div>
          {/* Progress bar */}
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-label="Organizer setup progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <CardDivider />

        {/* Steps */}
        <div className="flex flex-col gap-1">
          {steps.map((step, index) => (
            <OnboardingStep key={step.id} step={step} stepNumber={index + 1} />
          ))}
        </div>

        {/* Footer actions */}
        <CardDivider />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={`/orgs/${orgId}/onboarding`}
            className="inline-flex items-center justify-center gap-1.5 text-[13px] font-medium text-accent hover:underline sm:justify-start"
          >
            View full guide
            <Icon name="arrowR" size={14} />
          </Link>
          {nextStep && (
            <Link
              href={nextStep.href}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2 text-[13px] font-semibold text-surface hover:bg-ink-2 sm:w-auto"
            >
              Continue setup
              <Icon name="arrowR" size={14} />
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

function OnboardingStep({
  step,
  stepNumber,
}: {
  step: OnboardingStep
  stepNumber: number
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius)] px-3 py-3 transition-colors sm:flex-row sm:items-center sm:gap-4",
        step.done ? "opacity-60" : "hover:bg-bg",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        {/* Step indicator */}
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-semibold",
            step.done
              ? "border-accent bg-accent text-white"
              : "border-line text-ink-3",
          )}
        >
          {step.done ? (
            <Icon name="check" size={12} strokeWidth={2.5} />
          ) : (
            <span>{stepNumber}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="break-words text-[13px] font-semibold text-ink">{step.title}</span>
          <span className="break-words text-[12px] leading-relaxed text-ink-3">{step.description}</span>
        </div>
      </div>

      {/* CTA */}
      {!step.done && (
        <Link
          href={step.href}
          className="inline-flex w-full shrink-0 items-center justify-center gap-1 rounded-[var(--radius)] border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-bg sm:w-auto"
        >
          Go
          <Icon name="chevR" size={12} />
        </Link>
      )}
    </div>
  )
}
