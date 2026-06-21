"use client"

import * as React from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Icon } from "@/components/quiet/ui/icon"
import { Button } from "@/components/quiet/ui/button"

const PRESETS = [
  { label: "All time", from: null, to: null },
  { label: "This month", from: "thisMonth", to: null },
  { label: "Last 30 days", from: "30d", to: null },
  { label: "Last 90 days", from: "90d", to: null },
] as const

function resolvePresetDates(from: string): string {
  const now = new Date()
  if (from === "thisMonth") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  }
  if (from === "30d") {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  }
  if (from === "90d") {
    const d = new Date(now)
    d.setDate(d.getDate() - 90)
    return d.toISOString().slice(0, 10)
  }
  return from
}

interface FinanceDateFilterProps {
  currentFrom: string | null
  currentTo: string | null
}

export function FinanceDateFilter({ currentFrom, currentTo }: FinanceDateFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [from, setFrom] = React.useState(currentFrom ?? "")
  const [to, setTo] = React.useState(currentTo ?? "")

  function applyDates(newFrom: string | null, newTo: string | null) {
    const next = new URLSearchParams(searchParams?.toString() ?? "")
    if (newFrom) next.set("from", newFrom)
    else next.delete("from")
    if (newTo) next.set("to", newTo)
    else next.delete("to")
    router.push(`${pathname}?${next.toString()}`)
  }

  function handlePreset(preset: (typeof PRESETS)[number]) {
    const resolvedFrom = preset.from ? resolvePresetDates(preset.from) : null
    setFrom(resolvedFrom ?? "")
    setTo("")
    applyDates(resolvedFrom, null)
  }

  function handleCustomApply() {
    applyDates(from || null, to || null)
  }

  const hasFilter = !!currentFrom || !!currentTo

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Presets */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => handlePreset(p)}
            className={[
              "inline-flex items-center rounded-[var(--radius)] border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
              !currentFrom && !currentTo && p.from === null
                ? "border-ink bg-ink text-surface"
                : "border-line-2 bg-surface text-ink-3 hover:border-line hover:text-ink",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-line-2 bg-surface px-3 py-1.5">
          <Icon name="cal" size={13} className="text-ink-3" />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent font-mono text-[12px] text-ink outline-none"
            placeholder="From"
          />
        </div>
        <span className="font-mono text-[11px] text-ink-3">to</span>
        <div className="flex items-center gap-1 rounded-[var(--radius-md)] border border-line-2 bg-surface px-3 py-1.5">
          <Icon name="cal" size={13} className="text-ink-3" />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="bg-transparent font-mono text-[12px] text-ink outline-none"
            placeholder="To"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleCustomApply}>
          Apply
        </Button>
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("")
              setTo("")
              applyDates(null, null)
            }}
          >
            <Icon name="close" size={13} />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
