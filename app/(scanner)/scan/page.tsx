"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"

interface ScanResponse {
  valid: boolean
  status: "validated" | "duplicate" | "not_found" | "offline" | "error"
  message: string
  ticket?: { id: string; event_id: string; ticket_type_id: string } | null
  scan?: { scanned_at: string } | null
  previousScan?: { scanned_at: string } | null
}

interface OfflineScanPayload {
  code: string
  deviceId: string
  sessionId: string
  scannedAt: string
  location?: string
}

function loadDeviceId() {
  if (typeof window === "undefined") return "web"
  const existing = window.localStorage.getItem("ticketiv_scanner_device")
  if (existing) return existing
  const generated = `device-${crypto.randomUUID()}`
  window.localStorage.setItem("ticketiv_scanner_device", generated)
  return generated
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

export default function ScannerPage() {
  const [code, setCode] = useState("")
  const [eventId, setEventId] = useState("")
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [offlineQueue, setOfflineQueue] = useState<OfflineScanPayload[]>([])
  const deviceId = useMemo(() => loadDeviceId(), [])

  useEffect(() => { setOfflineQueue(loadOfflineQueue()) }, [])
  useEffect(() => { persistOfflineQueue(offlineQueue) }, [offlineQueue])

  useEffect(() => {
    if (!eventId || sessionId) return
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
    return () => { cancelled = true }
  }, [deviceId, eventId, sessionId])

  useEffect(() => {
    return () => {
      if (!sessionId) return
      fetch("/api/scanner/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => undefined)
    }
  }, [sessionId])

  const queueOfflineScan = () => {
    const scan: OfflineScanPayload = {
      code,
      deviceId,
      sessionId: sessionId ?? `offline-${deviceId}`,
      scannedAt: new Date().toISOString(),
    }
    setOfflineQueue((current) => [...current, scan])
  }

  const handleScan = async () => {
    setLoading(true)
    setResult(null)

    const payload = { code, deviceId, sessionId }

    try {
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, eventId }),
      })
      const data: ScanResponse = await response.json()
      setResult(data)
      if (!response.ok && data.status === "offline") queueOfflineScan()
    } catch {
      queueOfflineScan()
      setResult({ valid: true, status: "offline", message: "Network unavailable. Scan stored offline." })
    } finally {
      setLoading(false)
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
    } catch {
      setResult({ valid: false, status: "error", message: "Unable to sync offline scans" })
    }
  }

  const sessionCard = (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-h3">Session</p>
          <Chip size="sm" variant={sessionId ? "active" : "muted"}>
            {sessionId ? "Active" : "Setup"}
          </Chip>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label">Event ID</span>
          <input
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            placeholder="Enter event ID to start session"
            className={fieldClass}
          />
        </label>
        <div className="flex flex-col gap-2 text-[12px]">
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2">
            <span className="text-ink-3">Device</span>
            <span className="font-mono text-ink">{deviceId.substring(0, 16)}…</span>
          </div>
          {sessionId && (
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2">
              <span className="text-ink-3">Session</span>
              <span className="font-mono text-ink">{sessionId.substring(0, 16)}…</span>
            </div>
          )}
        </div>
        {offlineQueue.length > 0 && (
          <Button onClick={handleSync} variant="outline" size="sm" block>
            <Icon name="globe" size={14} />
            Sync {offlineQueue.length} offline scan{offlineQueue.length === 1 ? "" : "s"}
          </Button>
        )}
      </CardBody>
    </Card>
  )

  const resultBlock = result && (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3",
        result.valid
          ? "border-accent/30 bg-accent-soft text-ink"
          : "border-danger/30 bg-danger-soft text-danger"
      )}
    >
      <Icon name={result.valid ? "check" : "close"} size={18} className="mt-0.5" />
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-[14px] font-semibold">{result.message}</p>
        {result.scan?.scanned_at && (
          <p className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            <Icon name="clock" size={12} />
            {new Date(result.scan.scanned_at).toLocaleString()}
          </p>
        )}
        {result.previousScan?.scanned_at && (
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
            Previous · {new Date(result.previousScan.scanned_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile */}
      <div className="flex min-h-dvh flex-1 flex-col lg:hidden">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Scanner</h1>
            <p className="text-[13px] text-ink-3">Scan tickets to validate entry.</p>
          </div>
          {sessionCard}
          {resultBlock}
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
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Scan tickets</h1>
            <p className="text-[14px] text-ink-3">
              Validate attendee QR codes or ticket numbers to monitor entry at your event.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {sessionCard}

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

          <Card>
            <CardBody className="px-5 py-4">
              <p className="text-label">Recent scans</p>
            </CardBody>
            <CardDivider />
            <CardBody className="px-5 py-10 text-center">
              <p className="text-[13px] text-ink-3">No scans yet in this session.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}
