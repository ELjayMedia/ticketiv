"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { createPricingPlanVersionAction } from "./actions"

type PricingPlan = {
  id: string
  platform_percent_bps: number
  processor_percent_bps: number
  processor_fixed_cents: number
  min_platform_fee_cents: number | null
  currency: string
  effective_from: string
}

type OrganizationOption = {
  id: string
  name: string
  activePlan: PricingPlan | null
}

function percentInput(bps: number | null | undefined) {
  if (bps === null || bps === undefined) return ""
  return (bps / 100).toFixed(2)
}

function moneyInput(cents: number | null | undefined) {
  if (cents === null || cents === undefined) return "0.00"
  return (cents / 100).toFixed(2)
}

function parsePercentToBps(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

function parseMoneyToCents(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null
}

export function PricingPlanForm({
  organizations,
  initialOrgId,
}: {
  organizations: OrganizationOption[]
  initialOrgId?: string | null
}) {
  const initialIndex = Math.max(0, organizations.findIndex((org) => org.id === initialOrgId))
  const initialOrg = organizations[initialIndex] ?? organizations[0]
  const [orgId, setOrgId] = useState(initialOrg?.id ?? "")
  const [platformPercent, setPlatformPercent] = useState(percentInput(initialOrg?.activePlan?.platform_percent_bps))
  const [processorPercent, setProcessorPercent] = useState(percentInput(initialOrg?.activePlan?.processor_percent_bps))
  const [processorFixed, setProcessorFixed] = useState(moneyInput(initialOrg?.activePlan?.processor_fixed_cents))
  const [minPlatformFee, setMinPlatformFee] = useState(moneyInput(initialOrg?.activePlan?.min_platform_fee_cents))
  const [currency, setCurrency] = useState(initialOrg?.activePlan?.currency ?? "ZAR")

  const selectedOrg = organizations.find((org) => org.id === orgId) ?? organizations[0]

  function loadOrg(nextOrgId: string) {
    const org = organizations.find((candidate) => candidate.id === nextOrgId)
    setOrgId(nextOrgId)
    setPlatformPercent(percentInput(org?.activePlan?.platform_percent_bps))
    setProcessorPercent(percentInput(org?.activePlan?.processor_percent_bps))
    setProcessorFixed(moneyInput(org?.activePlan?.processor_fixed_cents))
    setMinPlatformFee(moneyInput(org?.activePlan?.min_platform_fee_cents))
    setCurrency(org?.activePlan?.currency ?? "ZAR")
  }

  const economics = useMemo(() => {
    const platformBps = parsePercentToBps(platformPercent)
    const processorBps = parsePercentToBps(processorPercent)
    const fixedCents = parseMoneyToCents(processorFixed)

    if (platformBps === null || processorBps === null || fixedCents === null) {
      return { tone: "neutral" as const, text: "Enter commission and processor costs to calculate break-even." }
    }

    if (platformBps <= processorBps) {
      return {
        tone: "danger" as const,
        text: "Margin warning: commission is at or below the processor percentage, so there is no finite percentage-only break-even price.",
      }
    }

    const breakEvenCents = Math.ceil((fixedCents * 10000) / (platformBps - processorBps))
    const formatted = new Intl.NumberFormat("en-SZ", {
      style: "currency",
      currency: /^[A-Z]{3}$/.test(currency) ? currency : "ZAR",
      minimumFractionDigits: 2,
    }).format(breakEvenCents / 100)

    return {
      tone: "safe" as const,
      text: `Percentage-margin break-even ticket price: ${formatted}.`,
    }
  }, [platformPercent, processorPercent, processorFixed, currency])

  if (!organizations.length) {
    return (
      <div className="rounded-[var(--radius-md)] border border-line bg-surface p-5 text-[13px] text-ink-3">
        No organizations are available. Create an organization before configuring pricing.
      </div>
    )
  }

  return (
    <form action={createPricingPlanVersionAction} className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
          Organization
          <select
            name="org_id"
            value={orgId}
            onChange={(event) => loadOrg(event.target.value)}
            className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-3 text-[13px] font-normal outline-none focus:border-accent"
            required
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
          Currency
          <input
            name="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 3))}
            pattern="[A-Z]{3}"
            maxLength={3}
            className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-3 font-mono text-[13px] font-normal uppercase outline-none focus:border-accent"
            required
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
          Sales commission (%)
          <input
            name="platform_percent"
            value={platformPercent}
            onChange={(event) => setPlatformPercent(event.target.value)}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="5.00"
            className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-3 font-mono text-[13px] font-normal outline-none focus:border-accent"
            required
          />
          <span className="font-normal text-ink-3">One organizer-side platform commission. Buyer pays face value.</span>
        </label>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
          Per-order fee floor
          <input
            name="min_platform_fee"
            value={minPlatformFee}
            onChange={(event) => setMinPlatformFee(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-3 font-mono text-[13px] font-normal outline-none focus:border-accent"
            required
          />
          <span className="font-normal text-ink-3">Minimum platform commission on an order, in the plan currency.</span>
        </label>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
          Processor percentage (%)
          <input
            name="processor_percent"
            value={processorPercent}
            onChange={(event) => setProcessorPercent(event.target.value)}
            type="number"
            min="0"
            max="100"
            step="0.01"
            placeholder="2.00"
            className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-3 font-mono text-[13px] font-normal outline-none focus:border-accent"
            required
          />
          <span className="font-normal text-ink-3">Internal processor-cost reference only; never shown as a second organizer charge.</span>
        </label>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink">
          Processor fixed fee
          <input
            name="processor_fixed"
            value={processorFixed}
            onChange={(event) => setProcessorFixed(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="h-10 rounded-[var(--radius)] border border-line-2 bg-surface px-3 font-mono text-[13px] font-normal outline-none focus:border-accent"
            required
          />
          <span className="font-normal text-ink-3">Internal cost reference in the plan currency.</span>
        </label>
      </div>

      <div className={economics.tone === "danger"
        ? "rounded-[var(--radius-md)] border border-danger/40 bg-danger/5 p-4"
        : economics.tone === "safe"
          ? "rounded-[var(--radius-md)] border border-accent/30 bg-accent-soft/40 p-4"
          : "rounded-[var(--radius-md)] border border-line bg-bg p-4"}
      >
        <p className="text-[12px] font-semibold text-ink">Break-even guard</p>
        <p className="mt-1 text-[12px] leading-5 text-ink-3">{economics.text}</p>
        <p className="mt-1 text-[11px] leading-5 text-ink-3">
          Conservative calculation: ticket price × (commission % − processor %) − processor fixed fee. The per-order fee floor is not counted in this break-even figure.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-line bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold text-ink">Create a new effective version</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-3">
            Saving retires the current active plan for {selectedOrg?.name ?? "this organization"}. Existing orders keep their snapshotted rates.
          </p>
        </div>
        <Button type="submit" variant="primary" size="md">Save pricing version</Button>
      </div>
    </form>
  )
}
