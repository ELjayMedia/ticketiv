"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { formatPrice, type Currency } from "@/lib/format"
import {
  formatPlatformFeeRate,
  organizerNetPerTicketCents,
  ticketFeeCents,
  type PlatformFeeRate,
} from "@/lib/fees/platform-fee"
import { setPlatformFeeAction } from "./actions"

const EXAMPLE_PRICES_CENTS = [0, 5000, 15000, 50000]

function toCents(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null
  return Math.round(Number(value) * 100)
}

function toBps(value: string): number | null {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value.trim())) return null
  const bps = Math.round(Number(value) * 100)
  return bps >= 0 && bps <= 10000 ? bps : null
}

export function PlatformFeeForm({ current }: { current: PlatformFeeRate }) {
  const [percent, setPercent] = useState((current.percentBps / 100).toFixed(2))
  const [fixed, setFixed] = useState((current.fixedPerTicketCents / 100).toFixed(2))
  const currency: Currency = current.currency

  const preview = useMemo<PlatformFeeRate | null>(() => {
    const bps = toBps(percent)
    const cents = toCents(fixed)
    if (bps === null || cents === null) return null
    return { percentBps: bps, fixedPerTicketCents: cents, currency }
  }, [percent, fixed, currency])

  const unchanged =
    preview !== null &&
    preview.percentBps === current.percentBps &&
    preview.fixedPerTicketCents === current.fixedPerTicketCents

  return (
    <form action={setPlatformFeeAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink" htmlFor="fee-percent">
          Percentage of each ticket
          <div className="flex items-stretch overflow-hidden rounded-[var(--radius)] border border-line-2 bg-surface focus-within:border-accent">
            <input
              id="fee-percent"
              name="percent"
              inputMode="decimal"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="w-full bg-transparent px-3 py-2.5 font-mono text-[14px] text-ink focus:outline-none"
              aria-describedby="fee-percent-hint"
              required
            />
            <span className="flex items-center border-l border-line px-3 font-mono text-[13px] text-ink-3">%</span>
          </div>
          <span id="fee-percent-hint" className="font-normal text-ink-3">0 to 100, up to two decimals.</span>
        </label>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-ink" htmlFor="fee-fixed">
          Fixed amount per ticket
          <div className="flex items-stretch overflow-hidden rounded-[var(--radius)] border border-line-2 bg-surface focus-within:border-accent">
            <span className="flex items-center border-r border-line px-3 font-mono text-[13px] text-ink-3">{currency}</span>
            <input
              id="fee-fixed"
              name="fixed_per_ticket"
              inputMode="decimal"
              value={fixed}
              onChange={(e) => setFixed(e.target.value)}
              className="w-full bg-transparent px-3 py-2.5 font-mono text-[14px] text-ink focus:outline-none"
              aria-describedby="fee-fixed-hint"
              required
            />
          </div>
          <span id="fee-fixed-hint" className="font-normal text-ink-3">Added to every paid ticket. Use 0 for none.</span>
        </label>
      </div>

      <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">Preview</p>
          <p className="text-[13px] font-semibold text-ink">
            {preview ? formatPlatformFeeRate(preview) : "Enter a valid percentage and amount"}
          </p>
        </div>
        {preview ? (
          <table className="mt-3 w-full text-[12px]">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-ink-3">
                <th className="pb-1.5 font-medium">Ticket price</th>
                <th className="pb-1.5 text-right font-medium">Ticketiv fee</th>
                <th className="pb-1.5 text-right font-medium">Organizer gets</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums text-ink">
              {EXAMPLE_PRICES_CENTS.map((price) => (
                <tr key={price} className="border-t border-line">
                  <td className="py-1.5">{formatPrice(price, currency, { decimals: true })}</td>
                  <td className="py-1.5 text-right">{formatPrice(ticketFeeCents(price, preview), currency, { decimals: true, freeLabel: "—" })}</td>
                  <td className="py-1.5 text-right">{formatPrice(organizerNetPerTicketCents(price, preview), currency, { decimals: true, freeLabel: "—" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <p className="mt-3 text-[12px] leading-5 text-ink-3">
          Buyers always pay the ticket price. The fee is deducted from the organizer&apos;s payout, never exceeds the
          ticket price, and free tickets pay nothing.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="accent" disabled={!preview || unchanged}>
          Save platform fee
        </Button>
        <p className="text-[12px] text-ink-3">
          Applies to orders placed from now on. Existing orders keep the fee they were placed with.
        </p>
      </div>
    </form>
  )
}
