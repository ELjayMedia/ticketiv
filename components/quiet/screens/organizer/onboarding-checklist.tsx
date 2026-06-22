import Link from "next/link"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"

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
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progressPct}%` }}
              aria-label={`${progressPct}% complete`}
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

        {/* Footer link to full guide */}
        <CardDivider />
        <div className="flex justify-end">
          <Link
            href={`/orgs/${orgId}/onboarding`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
          >
            View full guide
            <Icon name="arrowR" size={14} />
          </Link>
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
        "flex items-center gap-4 rounded-[var(--radius)] px-3 py-3 transition-colors",
        step.done ? "opacity-60" : "hover:bg-bg",
      )}
    >
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
        <span className="text-[13px] font-semibold text-ink">{step.title}</span>
        <span className="text-[12px] text-ink-3">{step.description}</span>
      </div>

      {/* CTA */}
      {!step.done && (
        <Link
          href={step.href}
          className="shrink-0 inline-flex items-center gap-1 rounded-[var(--radius)] border border-line-2 px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-bg"
        >
          Go
          <Icon name="chevR" size={12} />
        </Link>
      )}
    </div>
  )
}
