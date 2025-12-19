"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { QrCode, WifiOff, CheckCircle2, XCircle, Clock } from "lucide-react"

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
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex-1 flex flex-col">
        <div className="p-4 space-y-4 flex-1">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Scanner</h1>
            <p className="text-sm text-muted-foreground">Scan tickets to validate entry</p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Session</CardTitle>
                <Badge variant={sessionId ? "default" : "secondary"}>{sessionId ? "Active" : "Setup"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                placeholder="Enter Event ID"
                className="h-11"
              />
              <div className="flex items-center justify-between text-xs bg-muted p-3 rounded-lg">
                <span className="text-muted-foreground">Device</span>
                <span className="font-mono truncate ml-2">{deviceId.substring(0, 12)}...</span>
              </div>
              {offlineQueue.length > 0 && (
                <Button onClick={handleSync} variant="outline" className="w-full bg-transparent" size="sm">
                  <WifiOff className="h-4 w-4 mr-2" />
                  Sync {offlineQueue.length} Offline Scans
                </Button>
              )}
            </CardContent>
          </Card>

          {result && (
            <Alert
              variant={result.valid ? "default" : "destructive"}
              className={result.valid ? "border-green-500 bg-green-50" : ""}
            >
              <div className="flex items-start gap-3">
                {result.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                )}
                <AlertDescription className="flex-1">
                  <p className="font-semibold mb-1">{result.message}</p>
                  {result.scan?.scanned_at && (
                    <p className="text-xs flex items-center gap-1 mt-2">
                      <Clock className="h-3 w-3" />
                      {new Date(result.scan.scanned_at).toLocaleString()}
                    </p>
                  )}
                  {result.previousScan?.scanned_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Previous: {new Date(result.previousScan.scanned_at).toLocaleString()}
                    </p>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        <div className="p-4 border-t bg-card sticky bottom-0">
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <QrCode className="h-4 w-4" />
                <span>Ticket Code</span>
              </div>
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="Scan or enter code"
                className="h-12 text-base"
                autoFocus
              />
            </CardContent>
          </Card>
          <Button
            onClick={handleScan}
            disabled={loading || !code.trim()}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            {loading ? "Validating..." : "Validate Ticket"}
          </Button>
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Scan Tickets</h1>
            <p className="text-muted-foreground mt-2">
              Validate attendee QR codes or ticket numbers to monitor entry at your event.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Scanner Session</CardTitle>
                  <Badge variant={sessionId ? "default" : "secondary"} className="ml-2">
                    {sessionId ? "Active" : "Setup Required"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Event ID</label>
                  <Input
                    value={eventId}
                    onChange={(event) => setEventId(event.target.value)}
                    placeholder="Enter Event ID to start session"
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-muted-foreground">Device ID</span>
                    <span className="font-mono text-xs">{deviceId}</span>
                  </div>
                  {sessionId && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-muted-foreground">Session ID</span>
                      <span className="font-mono text-xs">{sessionId.substring(0, 16)}...</span>
                    </div>
                  )}
                </div>
                {offlineQueue.length > 0 && (
                  <Button onClick={handleSync} variant="outline" className="w-full bg-transparent">
                    <WifiOff className="h-4 w-4 mr-2" />
                    Sync {offlineQueue.length} Offline Scans
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Manual Entry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Ticket Code</label>
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Scan or paste ticket code"
                    className="font-mono"
                  />
                </div>
                <Button onClick={handleScan} disabled={loading || !code.trim()} className="w-full" size="lg">
                  {loading ? "Validating..." : "Validate Ticket"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {result && (
            <Alert
              variant={result.valid ? "default" : "destructive"}
              className={result.valid ? "border-green-500 bg-green-50" : ""}
            >
              <div className="flex items-start gap-4">
                {result.valid ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 shrink-0" />
                )}
                <AlertDescription className="flex-1">
                  <p className="font-semibold text-lg mb-2">{result.message}</p>
                  <div className="space-y-1 text-sm">
                    {result.scan?.scanned_at && (
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Scanned at: {new Date(result.scan.scanned_at).toLocaleString()}
                      </p>
                    )}
                    {result.previousScan?.scanned_at && (
                      <p className="text-muted-foreground">
                        Previous scan: {new Date(result.previousScan.scanned_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </div>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">No scans yet in this session</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
