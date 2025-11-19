"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  if (typeof window === "undefined") {
    return "web"
  }
  const existing = window.localStorage.getItem("ticketiv_scanner_device")
  if (existing) {
    return existing
  }
  const generated = `device-${crypto.randomUUID()}`
  window.localStorage.setItem("ticketiv_scanner_device", generated)
  return generated
}

function loadOfflineQueue(): OfflineScanPayload[] {
  if (typeof window === "undefined") {
    return []
  }
  try {
    const raw = window.localStorage.getItem("ticketiv_offline_scans")
    return raw ? (JSON.parse(raw) as OfflineScanPayload[]) : []
  } catch (error) {
    console.warn("Failed to parse offline scans", error)
    return []
  }
}

function persistOfflineQueue(queue: OfflineScanPayload[]) {
  if (typeof window === "undefined") {
    return
  }
  window.localStorage.setItem("ticketiv_offline_scans", JSON.stringify(queue))
}

export default function ScannerPage() {
  const [code, setCode] = useState("")
  const [eventId, setEventId] = useState("")
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [offlineQueue, setOfflineQueue] = useState<OfflineScanPayload[]>([])
  const deviceId = useMemo(() => loadDeviceId(), [])

  useEffect(() => {
    setOfflineQueue(loadOfflineQueue())
  }, [])

  useEffect(() => {
    persistOfflineQueue(offlineQueue)
  }, [offlineQueue])

  useEffect(() => {
    if (!eventId || sessionId) {
      return
    }

    let cancelled = false

    async function createSession() {
      try {
        const response = await fetch("/api/scanner/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId, eventId }),
        })

        if (!response.ok) {
          throw new Error("Unable to start session")
        }

        const data = await response.json()
        if (!cancelled) {
          setSessionId(data.id)
        }
      } catch (error) {
        console.error(error)
      }
    }

    createSession()

    return () => {
      cancelled = true
    }
  }, [deviceId, eventId, sessionId])

  useEffect(() => {
    return () => {
      if (!sessionId) {
        return
      }
      fetch("/api/scanner/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch((error) => console.error("Failed to close session", error))
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

    const payload = {
      code,
      deviceId,
      sessionId,
    }

    try {
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...payload, eventId }),
      })

      const data: ScanResponse = await response.json()
      setResult(data)

      if (!response.ok && data.status === "offline") {
        queueOfflineScan()
      }
    } catch (error) {
      console.error("Scan failed", error)
      queueOfflineScan()
      setResult({
        valid: true,
        status: "offline",
        message: "Network unavailable. Scan stored offline.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    if (offlineQueue.length === 0) {
      return
    }

    try {
      const response = await fetch("/api/scanner/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans: offlineQueue }),
      })

      if (!response.ok) {
        throw new Error("Sync failed")
      }

      setOfflineQueue([])
      setResult({ valid: true, status: "validated", message: "Offline scans synced" })
    } catch (error) {
      console.error("Failed to sync offline scans", error)
      setResult({ valid: false, status: "error", message: "Unable to sync offline scans" })
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold">Scan Tickets</h1>
        <p className="text-muted-foreground">
          Validate attendee QR codes or ticket numbers to monitor entry at your event.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scanner Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            placeholder="Event ID"
          />
          <div className="text-sm text-muted-foreground">
            Device ID: <span className="font-mono">{deviceId}</span>
            {sessionId && (
              <>
                <br />Session: <span className="font-mono">{sessionId}</span>
              </>
            )}
          </div>
          <Button onClick={handleSync} variant="outline" disabled={offlineQueue.length === 0}>
            Sync Offline Scans ({offlineQueue.length})
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Scan or paste ticket code"
          />
          <Button onClick={handleScan} disabled={loading || !code.trim()} className="w-full">
            {loading ? "Validating..." : "Validate Ticket"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Alert variant={result.valid ? "default" : "destructive"}>
          <AlertDescription>
            <p className="font-semibold">{result.message}</p>
            {result.scan?.scanned_at && <p>Scanned at: {new Date(result.scan.scanned_at).toLocaleString()}</p>}
            {result.previousScan?.scanned_at && (
              <p>Last scan: {new Date(result.previousScan.scanned_at).toLocaleString()}</p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
