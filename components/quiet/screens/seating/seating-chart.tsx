"use client"

// Quiet · Seating chart picker
// Pixel-faithful port of QuietSeating from hifi-quiet-mobile-more.jsx,
// driven by a normalized SeatMapSchema (see lib/data/attendee/seating.ts).

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
// Type-only import: server-only data module is erased from client bundle.
import type { EventSeatingChart, SeatCell, SeatState } from "@/lib/data/attendee/seating"

export interface SeatingChartProps {
  chart: EventSeatingChart
  currency?: string
  /** Called when user changes their selection so the page can place holds. */
  onSelectionChange?: (selectedLabels: string[]) => void
}

function stateClass(state: SeatState, isPremium: boolean, isBalcony: boolean): string {
  if (state === "sold") return "bg-line text-ink-3 border-line"
  if (state === "hold") return "bg-[#fde2c1] border-[#d4a667] text-ink"
  if (state === "pick") return "bg-accent border-accent text-white"
  // available
  if (isPremium) return "bg-[#fbf7ff] border-accent-soft text-ink"
  if (isBalcony) return "bg-[#fafaf7] border-line-2 text-ink"
  return "bg-surface border-line-2 text-ink"
}

export function SeatingChart({ chart, currency = "₹", onSelectionChange }: SeatingChartProps) {
  const router = useRouter()
  const MIN_SCALE = 0.5
  const MAX_SCALE = 3
  const SCALE_STEP = 0.25
  const [scale, setScale] = React.useState(1)

  const [picked, setPicked] = React.useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const s of chart.seats) if (s.state === "pick") initial.add(s.label)
    return initial
  })

  React.useEffect(() => {
    onSelectionChange?.([...picked])
  }, [picked, onSelectionChange])

  const togglePick = (cell: SeatCell) => {
    if (cell.state === "sold" || cell.state === "hold") return
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(cell.label)) next.delete(cell.label)
      else next.add(cell.label)
      return next
    })
  }

  const tierForRow = (row: string) => chart.schema.tiers[row] ?? chart.schema.tiers._default

  const byRow = new Map<string, SeatCell[]>()
  for (const seat of chart.seats) {
    if (!byRow.has(seat.row)) byRow.set(seat.row, [])
    byRow.get(seat.row)!.push(seat)
  }
  for (const list of byRow.values()) list.sort((a, b) => a.col - b.col)

  const aisles = new Set(chart.schema.aisles ?? [])

  const subtotalCents = [...picked].reduce((acc, label) => {
    const cell = chart.seats.find((s) => s.label === label)
    if (!cell) return acc
    return acc + (tierForRow(cell.row)?.priceCents ?? 0)
  }, 0)

  return (
    <div className="bg-bg pb-24">
      <div className="h-14" />

      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pb-3.5 pt-2">
        <button
          aria-label="Back"
          onClick={() => router.back()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60"
        >
          <Icon name="chevL" size={22} />
        </button>
        <div className="flex flex-1 flex-col">
          <span className="text-label">Pick seats · {picked.size} of {Math.max(picked.size, 2)}</span>
          <span className="text-[15px] font-semibold leading-tight">
            {chart.eventTitle} · {chart.whenLabel}
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-accent">HOLDS 9:42</span>
      </div>

      {/* Stage */}
      <div className="px-5 pb-3.5">
        <div className="rounded bg-ink py-2.5 text-center">
          <span className="font-mono text-xs font-semibold tracking-widest text-white">
            {chart.schema.stageLabel ?? "STAGE"}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="px-5 pb-4">
        <Card className="p-3.5">
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "top center", transition: "transform 0.15s ease" }}
          >
          <div className="flex flex-col items-center gap-1.5">
            {chart.schema.rows.map((row) => {
              const tier = tierForRow(row)
              const isPremium = tier?.colorKey === "violet-soft"
              const isBalcony = !isPremium && row === chart.schema.rows[chart.schema.rows.length - 1]
              const seats = byRow.get(row) ?? []
              return (
                <div key={row} className="flex items-center gap-[3px]">
                  <span className="w-3 text-right font-mono text-[9px] text-ink-3">{row}</span>
                  {Array.from({ length: chart.schema.cols }).map((_, ci) => {
                    const col = ci + 1
                    const cell = seats.find((s) => s.col === col)
                    const realState: SeatState = picked.has(cell?.label ?? "")
                      ? "pick"
                      : cell?.state ?? "avail"
                    const cls = cell ? stateClass(realState, isPremium, isBalcony) : "invisible"
                    return (
                      <React.Fragment key={col}>
                        <button
                          type="button"
                          disabled={!cell || cell.state === "sold" || cell.state === "hold"}
                          onClick={() => cell && togglePick(cell)}
                          className={`inline-flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] font-mono text-[8px] font-bold ${cls}`}
                        >
                          {realState === "pick" ? "✓" : ""}
                        </button>
                        {aisles.has(col) && <span className="w-2" />}
                      </React.Fragment>
                    )
                  })}
                  <span className="w-3 font-mono text-[9px] text-ink-3">{row}</span>
                </div>
              )
            })}
          </div>
          </div>
          <div className="mt-3.5 flex items-center justify-center gap-1.5">
            <button
              type="button"
              onClick={() => setScale(s => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))}
              disabled={scale <= MIN_SCALE}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line-2 bg-surface disabled:opacity-40"
            >
              <Icon name="minus" size={14} />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-ink-3">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale(s => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))}
              disabled={scale >= MAX_SCALE}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-line-2 bg-surface disabled:opacity-40"
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 pb-3.5">
        {(
          [
            ["bg-surface", "border-line-2", "Available"],
            ["bg-accent", "border-accent", "Selected"],
            ["bg-line", "border-line", "Sold"],
            ["bg-[#fde2c1]", "border-[#d4a667]", "On hold"],
            ["bg-[#fbf7ff]", "border-accent-soft", "Premium"],
          ] as Array<[string, string, string]>
        ).map(([bg, border, label]) => (
          <div key={label} className="flex items-center gap-1">
            <span className={`h-3.5 w-3.5 rounded-[3px] border-[1.5px] ${bg} ${border}`} />
            <span className="font-mono text-[10px] text-ink-3">{label}</span>
          </div>
        ))}
      </div>

      {/* Selection */}
      <div className="px-5 pb-4">
        <div className="text-label mb-2">Your selection · {picked.size}</div>
        <div className="flex flex-col gap-1.5">
          {[...picked].length === 0 ? (
            <div className="rounded-md border border-dashed border-line p-3 text-center font-mono text-[11px] text-ink-3">
              Tap available seats above.
            </div>
          ) : (
            [...picked].sort().map((label) => {
              const cell = chart.seats.find((s) => s.label === label)
              if (!cell) return null
              const tier = tierForRow(cell.row)
              return (
                <Card key={label} className="flex items-center gap-2.5 border-accent bg-accent-soft p-2.5">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent font-mono text-xs font-bold text-white">
                    {label}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <span className="text-[13px] font-semibold">{tier?.name ?? "Regular"}</span>
                    <span className="font-mono text-[11px] text-ink-3">
                      Row {cell.row} · Seat {cell.col}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold">
                    {currency}
                    {((tier?.priceCents ?? 0) / 100).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove seat ${label}`}
                    onClick={() => togglePick(cell)}
                    className="text-ink-3 hover:text-ink"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </Card>
              )
            })
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-1/2 z-10 w-full max-w-[480px] -translate-x-1/2 border-t border-line bg-surface px-5 pb-7 pt-3.5">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-label">{picked.size} seats · subtotal</span>
            <span className="font-mono text-xl font-semibold">
              {currency}
              {(subtotalCents / 100).toLocaleString()}
            </span>
          </div>
          <Button variant="accent" className="flex-1 rounded-md py-3.5 text-sm" disabled={picked.size === 0}>
            Continue <Icon name="arrowR" size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
