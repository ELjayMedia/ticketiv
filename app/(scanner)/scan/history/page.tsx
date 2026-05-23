"use client"

import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

const mockScans = [
  {
    id: "1",
    ticket_code: "TKT-ABC123",
    outcome: "valid",
    scanned_at: "2025-01-28T14:32:00Z",
    holder_name: "John Doe",
  },
  { id: "2", ticket_code: "TKT-DEF456", outcome: "already_used", scanned_at: "2025-01-28T14:31:00Z" },
  {
    id: "3",
    ticket_code: "TKT-GHI789",
    outcome: "valid",
    scanned_at: "2025-01-28T14:30:00Z",
    holder_name: "Jane Smith",
  },
  { id: "4", ticket_code: "TKT-JKL012", outcome: "invalid", scanned_at: "2025-01-28T14:29:00Z" },
  {
    id: "5",
    ticket_code: "TKT-MNO345",
    outcome: "valid",
    scanned_at: "2025-01-28T14:28:00Z",
    holder_name: "Mike Johnson",
  },
]

function outcomeChip(outcome: string) {
  if (outcome === "valid") {
    return (
      <Chip size="sm" variant="active">
        <Icon name="check" size={12} />
        Valid
      </Chip>
    )
  }
  if (outcome === "already_used") {
    return (
      <Chip size="sm" variant="muted">
        <Icon name="clock" size={12} />
        Used
      </Chip>
    )
  }
  return (
    <Chip size="sm" variant="muted" className="bg-danger-soft text-danger">
      <Icon name="close" size={12} />
      Invalid
    </Chip>
  )
}

function outcomeLabel(outcome: string) {
  if (outcome === "valid") return "Valid"
  if (outcome === "already_used") return "Already used"
  return "Invalid"
}

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

export default function ScanHistoryPage() {
  const validScans = mockScans.filter((s) => s.outcome === "valid").length
  const totalScans = mockScans.length
  const rejected = totalScans - validScans

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
            <Card>
              {mockScans.map((scan, i) => (
                <div key={scan.id}>
                  {i > 0 && <CardDivider />}
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <p className="truncate font-mono text-[13px] font-semibold text-ink">{scan.ticket_code}</p>
                      {scan.holder_name && (
                        <p className="text-[12px] text-ink-3">{scan.holder_name}</p>
                      )}
                      <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                        {new Date(scan.scanned_at).toLocaleTimeString()}
                      </p>
                    </div>
                    {outcomeChip(scan.outcome)}
                  </div>
                </div>
              ))}
            </Card>
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

        <Card>
          <CardBody className="flex items-center gap-2 px-5 py-4">
            <Icon name="cal" size={16} className="text-ink-3" />
            <p className="text-label">Today’s activity</p>
          </CardBody>
          <CardDivider />
          {mockScans.map((scan, i) => (
            <div key={scan.id}>
              {i > 0 && <CardDivider />}
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-[14px] font-semibold text-ink">{scan.ticket_code}</p>
                    {outcomeChip(scan.outcome)}
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {outcomeLabel(scan.outcome)}
                    </span>
                  </div>
                  {scan.holder_name && (
                    <p className="text-[13px] text-ink-3">{scan.holder_name}</p>
                  )}
                </div>
                <p className="font-mono text-[12px] tabular-nums text-ink-3">
                  {new Date(scan.scanned_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}
