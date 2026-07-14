"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats"
import {
  deltaFetchManifest,
  findInManifest,
  isLocallyUsed,
  loadManifest,
  markLocallyUsed,
  mergeManifestDelta,
  refreshManifest,
  type ScannerManifest,
} from "@/lib/scanner/manifest-store"
import {
  copyForScannerStatus,
  statusForScanOutcome,
  type ScannerOutcomeStatus,
  type ScannerOutcomeTone,
} from "@/lib/scanner/outcome-copy"
import {
  clearDeviceSession,
  clearSelectedEvent,
  loadDeviceSession,
  loadDeviceId,
  loadDeviceName,
  loadSelectedEvent,
  type SelectedScannerEvent,
} from "@/lib/scanner/session-store"

interface ScanResponse {
  valid: boolean
  status: ScannerOutcomeStatus
  message: string
  ticket?: { id: string; event_id: string; ticket_type_id: string } | null
  scan?: { scanned_at: string } | null
  previousScan?: { scanned_at: string } | null
}

interface OfflineScanPayload {
  code: string
  eventId: string
  deviceId: string
  sessionId: string
  scannedAt: string
  location?: string
}

interface RecentScan {
  id: string
  ticketCode: string
  status: ScannerOutcomeStatus
  scannedAt: string
}

function loadOfflineQueue(): OfflineScanPayload[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem("ticketiv_offline_scans")
    return raw ? (JSON.parse(raw) as OfflineScanPayload[]) : []
  } catch {
    return []
  }
}

function persistOfflineQueue(queue: OfflineScanPayload[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem("ticketiv_offline_scans", JSON.stringify(queue))
}

const fieldClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

const TONE_STYLES: Record<ScannerOutcomeTone, { border: string; icon: string }> = {
  success: { border: "border-accent/40 bg-accent-soft text-ink", icon: "check" },
  warning: { border: "border-warning/40 bg-warning/10 text-ink", icon: "bell" },
  danger: { border: "border-danger/40 bg-danger/5 text-danger", icon: "close" },
  muted: { border: "border-line bg-bg text-ink-3", icon: "clock" },
}

export default function ScannerPage() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SelectedScannerEvent | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deviceBound, setDeviceBound] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState<OfflineScanPayload[]>([])
  const [manifest, setManifest] = useState<ScannerManifest | null>(null)
  const [manifestLoading, setManifestLoading] = useState(false)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [, setTick] = useState(0)
  const deviceId = useMemo(() => loadDeviceId(), [])

  const eventId = selectedEvent?.id ?? ""
  const { stats: liveStats } = useEventLiveStats(eventId || null)

  // Setup the session only after hydration so we can redirect to /scan/setup
  // when the device hasn't picked an event yet, without breaking SSR.
  useEffect(() => {
    setHydrated(true)
    const ev = loadSelectedEvent()
    const name = loadDeviceName()
    const storedSession = loadDeviceSession()
    setSelectedEvent(ev)
    setDeviceName(name)
    if (ev && storedSession?.eventId === ev.id && storedSession.deviceId === deviceId) {
      setSessionId(storedSession.id)
      setDeviceBound(storedSession.deviceBound)
    } else {
      clearDeviceSession()
      setDeviceBound(false)
    }
    if (!ev) {
      router.replace("/scan/setup")
    }
  }, [deviceId, router])

  useEffect(() => {
    setOfflineQueue(loadOfflineQueue())
  }, [])

  useEffect(() => {
    persistOfflineQueue(offlineQueue)
  }, [offlineQueue])

  useEffect(() => {
    if (!eventId) {
      setManifest(null)
      return
    }
    setManifest(loadManifest(eventId))
  }, [eventId])

  useEffect(() => {
    if (!eventId || !sessionId) return
    let cancelled = false
    setManifestLoading(true)
    refreshManifest(eventId, deviceBound ? { deviceId, sessionId } : undefined)
      .then((fresh) => {
        if (cancelled || !fresh) return
        setManifest(fresh)
        setLastSyncAt(Date.now())
      })
      .finally(() => {
        if (!cancelled) setManifestLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [deviceBound, deviceId, eventId, sessionId])

  // 60-second background delta sync while device is online
  useEffect(() => {
    if (!eventId || !lastSyncAt) return
    const id = setInterval(async () => {
      if (!navigator.onLine) return
      const since = new Date(lastSyncAt).toISOString()
      const delta = await deltaFetchManifest(eventId, since, deviceBound ? { deviceId, sessionId } : undefined)
      if (!delta) return
      setManifest((current) => {
        if (!current) return current
        return mergeManifestDelta(current, delta)
      })
      setLastSyncAt(Date.now())
    }, 60_000)
    return () => clearInterval(id)
  }, [deviceBound, deviceId, eventId, lastSyncAt, sessionId])

  // Tick every 30s so the "last synced X ago" label refreshes
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!eventId || sessionId || deviceBound) return
    let cancelled = false
    async function createSession() {
      try {
        const response = await fetch("/api/scanner/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, eventId }),
        })
        if (!response.ok) throw new Error("Unable to start session")
        const data = await response.json()
        if (!cancelled) setSessionId(data.id)
      } catch (error) {
        console.error(error)
      }
    }
    createSession()
    return () => {
      cancelled = true
    }
  }, [deviceBound, deviceId, eventId, sessionId])

  // Best-effort session close on unmount. Explicit "End session" CTA below
  // is the canonical end-of-shift path.
  useEffect(() => {
    return () => {
      if (!sessionId) return
      fetch("/api/scanner/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, deviceId, eventId }),
      }).catch(() => undefined)
    }
  }, [deviceId, eventId, sessionId])

  const refreshRecentScans = useCallback(async () => {
    if (!eventId) return
    try {
      const params = new URLSearchParams({ eventId, limit: "10" })
      if (deviceBound && sessionId) {
        params.set("deviceId", deviceId)
        params.set("sessionId", sessionId)
      }
      const response = await fetch(`/api/scanner/scans?${params.toString()}`, {
        cache: "no-store",
      })
      if (!response.ok) return
      const data = (await response.json()) as {
        scans: Array<{ id: string; ticket_code: string; outcome: string; scanned_at: string }>
      }
      setRecentScans(
        (data.scans ?? []).map((row) => ({
          id: row.id,
          ticketCode: row.ticket_code,
          scannedAt: row.scanned_at,
          status: statusForScanOutcome(row.outcome),
        })),
      )
    } catch (error) {
      console.error("Failed to load recent scans", error)
    }
  }, [deviceBound, deviceId, eventId, sessionId])

  useEffect(() => {
    refreshRecentScans()
  }, [refreshRecentScans, sessionId, liveStats?.checked_in_count])

  const queueOfflineScan = () => {
    const scan: OfflineScanPayload = {
      code,
      eventId,
      deviceId,
      sessionId: sessionId ?? `offline-${deviceId}`,
      scannedAt: new Date().toISOString(),
    }
    setOfflineQueue((current) => [...current, scan])
  }

  function lastSyncLabel(): string | null {
    if (!lastSyncAt) return null
    const secs = Math.floor((Date.now() - lastSyncAt) / 1000)
    if (secs < 60) return "just now"
    const mins = Math.floor(secs / 60)
    return `${mins}m ago`
  }

  const handleManualSync = async () => {
    if (!eventId || manifestLoading) return
    if (lastSyncAt && navigator.onLine) {
      const since = new Date(lastSyncAt).toISOString()
      const delta = await deltaFetchManifest(eventId, since, deviceBound ? { deviceId, sessionId } : undefined)
      if (delta) {
        setManifest((current) => {
          if (!current) return current
          return mergeManifestDelta(current, delta)
        })
        setLastSyncAt(Date.now())
        return
      }
    }
    // Fall back to full refresh
    setManifestLoading(true)
    const fresh = await refreshManifest(eventId, deviceBound ? { deviceId, sessionId } : undefined)
    setManifestLoading(false)
    if (fresh) {
      setManifest(fresh)
      setLastSyncAt(Date.now())
    }
  }

  const handleScan = async () => {
    setLoading(true)
    setResult(null)

    const trimmedCode = code.trim()
    const scannedAt = new Date().toISOString()

    // Local-first: if we have a manifest, validate against it before
    // hitting the network. Gives sub-50ms response at the gate and keeps
    // the scanner working when connectivity drops mid-event.
    const manifestHit = findInManifest(manifest, trimmedCode)
    if (manifestHit) {
      if (manifestHit.already_checked_in || isLocallyUsed(eventId, trimmedCode)) {
        setResult({
          valid: false,
          status: "duplicate",
          message: "Already used",
          previousScan: { scanned_at: scannedAt },
        })
        setLoading(false)
        return
      }

      markLocallyUsed(eventId, trimmedCode)
      const localScan: OfflineScanPayload = {
        code: trimmedCode,
        eventId,
        deviceId,
        sessionId: sessionId ?? `offline-${deviceId}`,
        scannedAt,
      }
      setOfflineQueue((current) => [...current, localScan])

      setResult({
        valid: true,
        status: "validated",
        message: "Validated locally — queued to sync",
        ticket: {
          id: manifestHit.order_item_id,
          event_id: eventId,
          ticket_type_id: manifestHit.ticket_type_id,
        },
        scan: { scanned_at: scannedAt },
      })
      setLoading(false)
      setCode("")
      return
    }

    const payload = { code: trimmedCode, deviceId, sessionId }

    try {
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, eventId }),
      })
      const data: ScanResponse = await response.json()
      setResult(data)
      if (data.valid) markLocallyUsed(eventId, trimmedCode)
      if (!response.ok && data.status === "offline") queueOfflineScan()
      refreshRecentScans()
    } catch {
      queueOfflineScan()
      setResult({ valid: true, status: "offline", message: "Network unavailable. Scan stored offline." })
    } finally {
      setLoading(false)
      setCode("")
    }
  }

  const handleSync = async () => {
    if (offlineQueue.length === 0) return
    try {
      const response = await fetch("/api/scanner/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans: offlineQueue }),
      })
      if (!response.ok) throw new Error("Sync failed")
      setOfflineQueue([])
      setResult({ valid: true, status: "validated", message: "Offline scans synced" })
      refreshRecentScans()
    } catch {
      setResult({ valid: false, status: "error", message: "Unable to sync offline scans" })
    }
  }

  const handleEndSession = async () => {
    if (sessionId) {
      try {
        await fetch("/api/scanner/session", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, deviceId, eventId }),
        })
      } catch {
        // Best-effort. Session will time out on the server side regardless.
      }
    }
    clearSelectedEvent()
    clearDeviceSession()
    setSessionId(null)
    setDeviceBound(false)
    setSelectedEvent(null)
    router.push("/scan/setup")
  }

  // Block UI until we know whether to redirect. Avoids a one-frame flash
  // of the "no event" empty state for staff who already set up.
  if (!hydrated || !selectedEvent) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-[13px] text-ink-3">
        Loading scanner…
      </div>
    )
  }

  const eventStartsLabel = selectedEvent.startsAt
    ? new Date(selectedEvent.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null

  const eventCard = (
    <Card>
      <CardBody className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-label">Scanning event</span>
            <p className="text-h3">{selectedEvent.title}</p>
            {selectedEvent.venueName && (
              <span className="font-mono text-[11px] text-ink-3">{selectedEvent.venueName}</span>
            )}
            {eventStartsLabel && (
              <span className="font-mono text-[11px] text-ink-3">{eventStartsLabel}</span>
            )}
          </div>
          <Chip size="sm" variant={sessionId ? "active" : "muted"}>
            {sessionId ? "Active" : "Connecting…"}
          </Chip>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[12px]">
          <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2">
            <span className="text-ink-3">Checked in</span>
            <span className="font-mono text-[18px] font-semibold text-ink">{liveStats?.checked_in_count ?? 0}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-ink-3">Manifest</span>
              {lastSyncLabel() && (
                <span className="font-mono text-[9px] text-ink-4">{lastSyncLabel()}</span>
              )}
            </div>
            <span className="font-mono text-[18px] font-semibold text-ink">
              {manifestLoading ? "…" : (manifest?.items.length ?? 0)}
            </span>
          </div>
        </div>
        {(deviceName || offlineQueue.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
            {deviceName && (
              <span className="font-mono uppercase tracking-wide">{deviceName}</span>
            )}
            {offlineQueue.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 font-mono uppercase tracking-wide text-warning">
                <Icon name="clock" size={10} /> {offlineQueue.length} queued
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {offlineQueue.length > 0 && (
            <Button onClick={handleSync} variant="outline" size="sm">
              <Icon name="globe" size={14} />
              Sync {offlineQueue.length}
            </Button>
          )}
          <Button onClick={handleManualSync} variant="outline" size="sm" disabled={manifestLoading}>
            <Icon name="download" size={14} />
            {manifestLoading ? "Syncing…" : "Sync now"}
          </Button>
          <Button onClick={handleEndSession} variant="outline" size="sm">
            <Icon name="close" size={14} />
            End session
          </Button>
        </div>
      </CardBody>
    </Card>
  )

  const resultBlock = result && <ResultCard result={result} />

  const recentScansBlock = (
    <Card>
      <CardBody className="flex items-center justify-between px-5 py-4">
        <p className="text-label">Recent scans</p>
        <span className="font-mono text-[11px] text-ink-3">last {recentScans.length}</span>
      </CardBody>
      <CardDivider />
      {recentScans.length === 0 ? (
        <CardBody className="px-5 py-8 text-center">
          <p className="text-[13px] text-ink-3">No scans yet in this session.</p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-line">
          {recentScans.map((scan) => {
            const copy = copyForScannerStatus(scan.status)
            return (
              <li key={scan.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  className={cn(
                    "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    copy.tone === "success" && "bg-accent-soft text-accent",
                    copy.tone === "warning" && "bg-warning/10 text-warning",
                    copy.tone === "danger" && "bg-danger/10 text-danger",
                    copy.tone === "muted" && "bg-line/40 text-ink-3",
                  )}
                >
                  <Icon name={TONE_STYLES[copy.tone].icon} size={14} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold">{copy.title}</span>
                  <span className="truncate font-mono text-[11px] text-ink-3">{scan.ticketCode}</span>
                </div>
                <span className="font-mono text-[11px] text-ink-3">
                  {new Date(scan.scannedAt).toLocaleTimeString()}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )

  return (
    <>
      {/* Mobile */}
      <div className="flex min-h-dvh flex-1 flex-col lg:hidden">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-h1">Scanner</h1>
          </div>
          {eventCard}
          {resultBlock}
          {recentScansBlock}
        </div>

        <div className="sticky bottom-0 border-t border-line bg-surface p-4">
          <Card className="mb-4">
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-ink-3">
                <Icon name="qr" size={16} />
                <span className="text-label">Ticket code</span>
              </div>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Scan or enter code"
                className={cn(fieldClass, "h-12 text-[16px]")}
                autoFocus
              />
            </CardBody>
          </Card>
          <Button
            onClick={handleScan}
            disabled={loading || !code.trim()}
            variant="primary"
            size="md"
            block
            className="h-14 text-[16px]"
          >
            {loading ? "Validating…" : "Validate ticket"}
          </Button>
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-4xl px-4 py-10 sm:px-6 lg:block lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1">Scan tickets</h1>
              <p className="text-[14px] text-ink-3">
                Validate attendee QR codes or ticket numbers to monitor entry at your event.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {eventCard}

            <Card>
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Icon name="qr" size={18} className="text-ink-3" />
                  <p className="text-h3">Manual entry</p>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-label">Ticket code</span>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Scan or paste ticket code"
                    className={cn(fieldClass, "font-mono")}
                  />
                </label>
                <Button onClick={handleScan} disabled={loading || !code.trim()} variant="primary" size="md" block>
                  {loading ? "Validating…" : "Validate ticket"}
                </Button>
              </CardBody>
            </Card>
          </div>

          {resultBlock}

          {recentScansBlock}
        </div>
      </div>
    </>
  )
}

function ResultCard({ result }: { result: ScanResponse }) {
  const copy = copyForScannerStatus(result.status)
  const tone = TONE_STYLES[copy.tone]
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3", tone.border)}
    >
      <Icon name={tone.icon} size={18} className="mt-0.5" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-[14px] font-semibold">{copy.title}</p>
        <p className="text-[12px]">{result.message || copy.detail}</p>
        {result.scan?.scanned_at && (
          <p className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider opacity-70">
            <Icon name="clock" size={12} />
            {new Date(result.scan.scanned_at).toLocaleString()}
          </p>
        )}
        {result.previousScan?.scanned_at && (
          <p className="font-mono text-[11px] uppercase tracking-wider opacity-70">
            Previous · {new Date(result.previousScan.scanned_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}
