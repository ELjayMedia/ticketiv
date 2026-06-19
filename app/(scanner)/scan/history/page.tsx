"use client"

import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

function StatTile({ value, label, tone }: { value: number; label: string; tone?: "accent" | "default" }) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-1 px-4 py-5 text-center">
        <p
          className={
            tone === "accent"
              ? "font-mono text-[32px] font-semibold tabular-nums text-accent"
              : "font-mono text-[32px] font-semibold tabular-nums text-ink"
          }
        >
          {value}
        </p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
      </CardBody>
    </Card>
  )
}

function EmptyHistoryState() {
  return (
    <Card flat className="border-dashed">
      <CardBody className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg">
          <Icon name="clock" size={20} className="text-ink-3" />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-[15px] font-semibold text-ink">No scan history yet</h2>
          <p className="max-w-md text-[13px] text-ink-3">
            Completed ticket scans will appear here once scanners begin validating attendees.
          </p>
        </div>
      </CardBody>
    </Card>
  )
}

export default function ScanHistoryPage() {
  const validScans = 0
  const totalScans = 0
  const rejected = 0

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
          <h1 className="text-h3">Scan history</h1>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile value={validScans} label="Valid scans" tone="accent" />
            <StatTile value={totalScans} label="Total scans" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-ink-3">
              <Icon name="cal" size={14} />
              <span className="text-label">Today’s activity</span>
            </div>

            <EmptyHistoryState />
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[900px] px-4 py-8 lg:block">
        <div className="mb-8 flex flex-col gap-3">
          <Link
            href="/scan"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Back to scanner
          </Link>
          <h1 className="text-h1">Scan history</h1>
        </div>

        <div className="mb-8 grid grid-cols-3 gap-4">
          <StatTile value={validScans} label="Valid scans" tone="accent" />
          <StatTile value={totalScans} label="Total scans" />
          <StatTile value={rejected} label="Rejected" />
        </div>

        <EmptyHistoryState />
      </div>
    </>
  )
}
