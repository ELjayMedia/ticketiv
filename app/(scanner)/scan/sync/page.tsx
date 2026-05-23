"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

export default function SyncQueuePage() {
  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState(0)

  const pendingScans = 3
  const lastSync = "2 minutes ago"

  const handleSync = async () => {
    setSyncing(true)
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setSyncing(false)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const statusCard = (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-warning" aria-hidden />
            <span className="text-[14px] font-semibold text-ink">Offline mode active</span>
          </div>
          <Chip size="sm" variant="muted">
            <Icon name="globe" size={12} />
            No connection
          </Chip>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Pending scans</p>
            <p className="font-mono text-[28px] font-semibold tabular-nums text-ink">{pendingScans}</p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Last sync</p>
            <p className="text-[16px] font-semibold text-ink">{lastSync}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  )

  const syncCard = (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-h3">Sync queue</p>
          <p className="text-[13px] text-ink-3">Scans waiting to be uploaded.</p>
        </div>
        {syncing ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-ink-3">Syncing…</span>
              <span className="font-mono font-semibold text-ink">{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-bg p-3">
              <Icon name="settings" size={16} className="mt-0.5 text-ink-3" />
              <div className="flex flex-col gap-1 text-[13px]">
                <p className="font-semibold text-ink">Offline scanning is active</p>
                <p className="text-ink-3">
                  Your scans are stored locally and will sync when you’re back online.
                </p>
              </div>
            </div>
            <Button onClick={handleSync} disabled={pendingScans === 0} variant="primary" size="md" block>
              <Icon name="arrowR" size={14} />
              Sync now
            </Button>
          </>
        )}
      </CardBody>
    </Card>
  )

  const pendingCard = (
    <Card>
      <CardBody className="px-5 py-4">
        <p className="text-label">Pending items ({pendingScans})</p>
      </CardBody>
      <CardDivider />
      {[1, 2, 3].map((i, idx) => (
        <div key={i}>
          {idx > 0 && <CardDivider />}
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              <Icon name="clock" size={16} className="text-ink-3" />
              <div className="flex flex-col gap-0.5">
                <p className="font-mono text-[13px] font-semibold text-ink">
                  TKT-{String(i).padStart(6, "0")}
                </p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Valid scan · 2 minutes ago
                </p>
              </div>
            </div>
            <Chip size="sm" variant="default">Pending upload</Chip>
          </div>
        </div>
      ))}
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
          <h1 className="text-h3">Offline sync</h1>
        </header>

        <div className="flex flex-col gap-4 p-4">
          {statusCard}
          {syncCard}
          {pendingCard}
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-[800px] px-4 py-8 lg:block">
        <div className="mb-8 flex flex-col gap-3">
          <Link
            href="/scan"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Back to scanner
          </Link>
          <h1 className="text-h1">Offline sync</h1>
        </div>
        <div className="flex flex-col gap-6">
          {statusCard}
          {syncCard}
          {pendingCard}
        </div>
      </div>
    </>
  )
}
