"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import jsQR from "jsqr"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import {
  evaluateScannerOfflineManifest,
  type ScannerInputMode,
  type ScannerOfflineScanPayload,
} from "@ticketiv/shared"
import { useEventLiveStats } from "@/lib/hooks/use-event-live-stats"
import {
  deltaFetchManifest,
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
  inputMode?: ScannerInputMode
  checkedInAt?: string | null
  ticket?: { id: string; event_id: string; ticket_type_id: string } | null
  scan?: { scanned_at: string } | null
  previousScan?: { scanned_at: string } | null
}

interface NdefReaderLike {
  scan: (options?: { signal?: AbortSignal }) => Promise<void>
  addEventListener: (type: "reading" | "readingerror", listener: (event: Event) => void) => void
}

interface NdefReadingEvent extends Event {
  serialNumber?: string
  message?: {
    records?: Array<{
      data?: DataView
      encoding?: string
    }>
  }
}

interface DetectedBarcode {
  rawValue?: string
}

interface BarcodeDetectorLike {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
  getSupportedFormats?: () => Promise<string[]>
}

type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unsupported" | "error"

type OfflineScanPayload = ScannerOfflineScanPayload

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

function createClientAttemptId() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function parseTapBandCredential(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const param =
      url.searchParams.get("credentialPublicId") ??
      url.searchParams.get("credential_public_id") ??
      url.searchParams.get("tapband") ??
      url.searchParams.get("id")

    if (param?.trim()) return param.trim()

    const pathCredential = url.pathname.split("/").filter(Boolean).pop()
    if (pathCredential?.trim()) return pathCredential.trim()
  } catch {
    // Plain TapBand references are expected from serial readers and fallback input.
  }

  const tagged = trimmed.match(/(?:tapband|credential_public_id|credential|band)[=:/]+([A-Za-z0-9._-]+)/i)
  return tagged?.[1] ?? trimmed
}

function extractTapBandCredentialFromNdef(event: NdefReadingEvent) {
  const records = event.message?.records ?? []

  for (const record of records) {
    if (!record.data) continue

    try {
      const text = new TextDecoder(record.encoding || "utf-8").decode(record.data)
      const credential = parseTapBandCredential(text)
      if (credential) return credential
    } catch {
      // Ignore unreadable NDEF records and fall back to the reader serial.
    }
  }

  return parseTapBandCredential(event.serialNumber)
}

export default function ScannerPage() {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SelectedScannerEvent | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [inputMode, setInputMode] = useState<ScannerInputMode>("qr")
  const [code, setCode] = useState("")
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [nfcSupported] = useState(() => typeof window !== "undefined" && "NDEFReader" in window)
  const [nfcListening, setNfcListening] = useState(false)
  const [nfcStatus, setNfcStatus] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle")
  const [cameraMessage, setCameraMessage] = useState<string | null>(null)
  const [cameraPaused, setCameraPaused] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [deviceBound, setDeviceBound] = useState(false)
  const [offlineQueue, setOfflineQueue] = useState<OfflineScanPayload[]>([])
  const [manifest, setManifest] = useState<ScannerManifest | null>(null)
  const [manifestLoading, setManifestLoading] = useState(false)
  const [recentScans, setRecentScans] = useState<RecentScan[]>([])
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [, setTick] = useState(0)
  const nfcReaderRef = useRef<NdefReaderLike | null>(null)
  const nfcAbortRef = useRef<AbortController | null>(null)
  const lastTapAttemptRef = useRef<{ credential: string; at: number } | null>(null)
  const tapBandInFlightRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraFrameRef = useRef<number | null>(null)
  const cameraAttemptRef = useRef(0)
  const cameraPausedRef = useRef(false)
  const qrScanInFlightRef = useRef(false)
  const lastQrRef = useRef<{ value: string; at: number } | null>(null)
  const handleQrValidationRef = useRef<(value: string) => Promise<void>>(async () => undefined)
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
      nfcAbortRef.current?.abort()
      nfcAbortRef.current = null
      nfcReaderRef.current = null
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

  const queueOfflineScan = useCallback(
    (ticketCode: string, scannedAt = new Date().toISOString()) => {
      const scan: OfflineScanPayload = {
        code: ticketCode,
        eventId,
        deviceId,
        sessionId: sessionId ?? `offline-${deviceId}`,
        scannedAt,
      }
      setOfflineQueue((current) => [...current, scan])
    },
    [deviceId, eventId, sessionId],
  )

  function lastSyncLabel(): string | null {
    if (!lastSyncAt) return null
    const secs = Math.floor((Date.now() - lastSyncAt) / 1000)
    if (secs < 60) return "just now"
    const mins = Math.floor(secs / 60)
    return `${mins}m ago`
  }

  const stopNfcReader = () => {
    nfcAbortRef.current?.abort()
    nfcAbortRef.current = null
    nfcReaderRef.current = null
    setNfcListening(false)
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

  const handleScan = useCallback(async (scanCode: string) => {
    setLoading(true)
    setResult(null)

    const trimmedCode = scanCode.trim()
    if (!trimmedCode) {
      setLoading(false)
      return
    }
    const scannedAt = new Date().toISOString()

    const validateOffline = () =>
      evaluateScannerOfflineManifest({
        manifest,
        ticketCode: trimmedCode,
        eventId,
        deviceId,
        sessionId: sessionId ?? `offline-${deviceId}`,
        scannedAt,
        locallyUsed: isLocallyUsed(eventId, trimmedCode),
      })

    const applyOfflineResult = () => {
      const offlineEvaluation = validateOffline()
      if (offlineEvaluation.action === "miss" || !offlineEvaluation.result) return false

      if (offlineEvaluation.action === "queue" && offlineEvaluation.offlineScan) {
        markLocallyUsed(eventId, trimmedCode)
        setOfflineQueue((current) => [...current, offlineEvaluation.offlineScan])
      }

      setResult({
        valid: offlineEvaluation.result.valid,
        status: offlineEvaluation.result.status,
        message: offlineEvaluation.result.message,
        checkedInAt: offlineEvaluation.result.checkedInAt,
        ticket: {
          id: offlineEvaluation.item.order_item_id,
          event_id: eventId,
          ticket_type_id: offlineEvaluation.item.ticket_type_id,
        },
        scan: offlineEvaluation.action === "queue" ? { scanned_at: scannedAt } : null,
        previousScan: offlineEvaluation.action === "duplicate" ? { scanned_at: scannedAt } : null,
      })
      return true
    }

    // Online browsers must write the check-in to the server first. The local
    // manifest is used only when the browser reports no connectivity or the
    // request genuinely fails.
    if (!navigator.onLine) {
      const handledOffline = applyOfflineResult()
      if (!handledOffline) {
        setResult({
          valid: false,
          status: "error",
          message: "This ticket is not in the offline manifest. Reconnect to validate it.",
        })
      }
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
      const contentType = response.headers.get("content-type") ?? ""
      if (response.redirected || !contentType.includes("application/json")) {
        throw new Error("Scanner validation did not return JSON")
      }
      const data: ScanResponse = await response.json()
      setResult(data)
      if (data.valid) markLocallyUsed(eventId, trimmedCode)
      if (!response.ok && data.status === "offline") queueOfflineScan(trimmedCode, scannedAt)
      refreshRecentScans()
    } catch {
      const handledOffline = applyOfflineResult()
      if (!handledOffline) {
        setResult({
          valid: false,
          status: "error",
          message: "Online validation failed and this ticket is not in the offline manifest. Try again.",
        })
      }
    } finally {
      setLoading(false)
      setCode("")
    }
  }, [deviceId, eventId, manifest, queueOfflineScan, refreshRecentScans, sessionId])

  useEffect(() => {
    handleQrValidationRef.current = handleScan
  }, [handleScan])

  const releaseCameraResources = useCallback(() => {
    if (cameraFrameRef.current !== null) {
      window.cancelAnimationFrame(cameraFrameRef.current)
      cameraFrameRef.current = null
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    qrScanInFlightRef.current = false
  }, [])

  const closeCamera = useCallback(() => {
    cameraAttemptRef.current += 1
    releaseCameraResources()
    cameraPausedRef.current = false
    setCameraPaused(false)
    setCameraOpen(false)
    setCameraStatus("idle")
    setCameraMessage(null)
  }, [releaseCameraResources])

  const handleScanNext = useCallback(() => {
    cameraPausedRef.current = false
    setCameraPaused(false)
    setCameraMessage(null)
    setResult(null)
    setCode("")
  }, [])

  const openCamera = useCallback(async () => {
    const attempt = cameraAttemptRef.current + 1
    cameraAttemptRef.current = attempt
    releaseCameraResources()
    cameraPausedRef.current = false
    lastQrRef.current = null
    setCameraPaused(false)
    setResult(null)
    setCode("")
    setCameraOpen(true)
    setCameraStatus("requesting")
    setCameraMessage("Requesting camera access…")

    if (!window.isSecureContext) {
      setCameraStatus("error")
      setCameraMessage("Camera scanning requires a secure HTTPS connection.")
      return
    }

    const Detector = (window as Window &
      typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported")
      setCameraMessage(
        "This browser cannot access a live camera. Update Safari or enter the ticket code manually.",
      )
      return
    }

    if (Detector?.getSupportedFormats) {
      try {
        const formats = await Detector.getSupportedFormats()
        if (cameraAttemptRef.current !== attempt) return
        if (!formats.includes("qr_code")) {
          setCameraStatus("unsupported")
          setCameraMessage("This browser camera does not support QR-code detection.")
          return
        }
      } catch {
        // Some Chromium builds omit format discovery but still support the constructor.
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      if (cameraAttemptRef.current !== attempt) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      cameraStreamRef.current = stream
      let video = videoRef.current
      if (!video) {
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
        video = videoRef.current
      }
      if (!video) throw new Error("Camera preview could not be mounted")

      video.srcObject = stream
      await video.play()
      if (cameraAttemptRef.current !== attempt) return

      const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null
      const fallbackCanvas = detector ? null : document.createElement("canvas")
      const fallbackContext = fallbackCanvas?.getContext("2d", { willReadFrequently: true }) ?? null
      setCameraStatus("active")
      setCameraMessage(null)
      let lastDetectionAt = 0

      const detectFrame = async (timestamp: number) => {
        if (
          cameraAttemptRef.current !== attempt ||
          cameraStreamRef.current !== stream
        ) {
          return
        }

        if (
          timestamp - lastDetectionAt >= 250 &&
          !cameraPausedRef.current &&
          !qrScanInFlightRef.current &&
          video.readyState >= 2
        ) {
          lastDetectionAt = timestamp
          try {
            let value: string | undefined

            if (detector) {
              const detections = await detector.detect(video)
              value = detections.find((item) => item.rawValue?.trim())?.rawValue?.trim()
            } else if (fallbackCanvas && fallbackContext && video.videoWidth > 0 && video.videoHeight > 0) {
              fallbackCanvas.width = video.videoWidth
              fallbackCanvas.height = video.videoHeight
              fallbackContext.drawImage(video, 0, 0, fallbackCanvas.width, fallbackCanvas.height)
              const frame = fallbackContext.getImageData(0, 0, fallbackCanvas.width, fallbackCanvas.height)
              value = jsQR(frame.data, frame.width, frame.height, {
                inversionAttempts: "dontInvert",
              })?.data.trim()
            }

            if (cameraAttemptRef.current !== attempt) return

            if (value) {
              const now = Date.now()
              const repeated = lastQrRef.current?.value === value && now - lastQrRef.current.at < 2500
              if (!repeated) {
                lastQrRef.current = { value, at: now }
                qrScanInFlightRef.current = true
                cameraPausedRef.current = true
                setCameraPaused(true)
                setCameraMessage("QR code found. Validating ticket…")
                setCode(value)
                navigator.vibrate?.(60)

                try {
                  await handleQrValidationRef.current(value)
                } finally {
                  qrScanInFlightRef.current = false
                  if (cameraAttemptRef.current === attempt) setCameraMessage(null)
                }
              }
            }
          } catch {
            if (cameraAttemptRef.current !== attempt) return
            releaseCameraResources()
            setCameraStatus("error")
            setCameraMessage("The camera started, but this browser could not read QR codes.")
            return
          }
        }

        if (cameraAttemptRef.current === attempt) {
          cameraFrameRef.current = window.requestAnimationFrame((nextTimestamp) => {
            void detectFrame(nextTimestamp)
          })
        }
      }

      cameraFrameRef.current = window.requestAnimationFrame((timestamp) => {
        void detectFrame(timestamp)
      })
    } catch (error) {
      if (cameraAttemptRef.current !== attempt) return
      releaseCameraResources()
      const errorName = error instanceof DOMException ? error.name : ""

      if (errorName === "NotAllowedError" || errorName === "SecurityError") {
        setCameraStatus("denied")
        setCameraMessage(
          "Camera permission is blocked. Allow camera access for ticketiv.app in your browser settings, then try again.",
        )
      } else if (errorName === "NotFoundError") {
        setCameraStatus("error")
        setCameraMessage("No camera was found on this device.")
      } else if (errorName === "NotReadableError") {
        setCameraStatus("error")
        setCameraMessage("The camera is busy in another app. Close it there, then try again.")
      } else {
        setCameraStatus("error")
        setCameraMessage("Unable to start the camera. Try again or enter the ticket code manually.")
      }
    }
  }, [releaseCameraResources])

  useEffect(() => {
    return () => {
      cameraAttemptRef.current += 1
      releaseCameraResources()
    }
  }, [releaseCameraResources])

  const handleTapBandScan = async (credentialValue = code) => {
    if (tapBandInFlightRef.current) return

    const credentialPublicId = parseTapBandCredential(credentialValue)
    const now = Date.now()
    const scannedAt = new Date(now).toISOString()

    if (!credentialPublicId) {
      setResult({ valid: false, status: "tapband_reader_error", message: "TapBand could not be read" })
      return
    }

    const lastAttempt = lastTapAttemptRef.current
    if (lastAttempt?.credential === credentialPublicId && now - lastAttempt.at < 2500) {
      setResult({
        valid: false,
        status: "duplicate",
        message: "TapBand was just read. Wait a moment before retrying.",
      })
      return
    }

    lastTapAttemptRef.current = { credential: credentialPublicId, at: now }
    tapBandInFlightRef.current = true
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "tapband",
          credentialPublicId,
          eventId,
          deviceId,
          sessionId,
          scannedAt,
          attemptId: createClientAttemptId(),
        }),
      })
      const data: ScanResponse = await response.json()
      setResult(data)
      refreshRecentScans()
    } catch {
      setResult({
        valid: false,
        status: "tapband_reader_error",
        message: "Network unavailable. TapBand entry needs online validation.",
      })
    } finally {
      tapBandInFlightRef.current = false
      setLoading(false)
      setCode("")
    }
  }

  const handleNfcRead = async () => {
    setInputMode("tapband")
    setResult(null)

    if (!nfcSupported) {
      setNfcStatus("Manual fallback ready")
      setResult({
        valid: false,
        status: "tapband_reader_error",
        message: "NFC reader is unavailable on this device. Enter the TapBand reference manually.",
      })
      return
    }

    if (nfcReaderRef.current) {
      setNfcStatus("Listening for TapBand")
      return
    }

    const Reader = (window as Window & typeof globalThis & { NDEFReader?: new () => NdefReaderLike }).NDEFReader
    if (!Reader) return

    const reader = new Reader()
    const abortController = new AbortController()
    nfcReaderRef.current = reader
    nfcAbortRef.current = abortController
    setNfcListening(true)
    setNfcStatus("Listening for TapBand")

    reader.addEventListener("reading", (event) => {
      const credentialPublicId = extractTapBandCredentialFromNdef(event as NdefReadingEvent)
      if (!credentialPublicId) {
        setResult({ valid: false, status: "tapband_reader_error", message: "TapBand could not be read" })
        return
      }
      setCode(credentialPublicId)
      void handleTapBandScan(credentialPublicId)
    })

    reader.addEventListener("readingerror", () => {
      setResult({
        valid: false,
        status: "tapband_reader_error",
        message: "TapBand could not be read. Try again or use QR fallback.",
      })
    })

    try {
      await reader.scan({ signal: abortController.signal })
    } catch (error: any) {
      if (abortController.signal.aborted) return
      nfcReaderRef.current = null
      nfcAbortRef.current = null
      setNfcListening(false)
      setNfcStatus(null)
      setResult({
        valid: false,
        status: "tapband_reader_error",
        message: error?.message ?? "NFC reader could not start",
      })
    }
  }

  const handleSync = async () => {
    if (offlineQueue.length === 0) return
    try {
      const queuedScans = [...offlineQueue]
      const response = await fetch("/api/scanner/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scans: queuedScans }),
      })
      if (!response.ok) throw new Error("Sync failed")

      const syncResult = (await response.json()) as {
        inserted?: number
        results?: Array<{ code: string; outcome: string; idempotent?: boolean }>
      }
      const results = syncResult.results ?? []
      const completedIndexes = new Set(
        results.flatMap((item, index) =>
          item.outcome === "validated" || item.outcome === "duplicate" || item.idempotent ? [index] : [],
        ),
      )
      const remaining = queuedScans.filter((_, index) => !completedIndexes.has(index))
      const syncedCount = queuedScans.length - remaining.length

      setOfflineQueue(remaining)
      if (syncedCount === 0) {
        setResult({
          valid: false,
          status: "error",
          message: "No queued scans were accepted. They remain queued so you can retry.",
        })
        return
      }

      setResult({
        valid: true,
        status: "validated",
        message:
          remaining.length > 0
            ? `${syncedCount} scan${syncedCount === 1 ? "" : "s"} synced; ${remaining.length} still queued`
            : `${syncedCount} offline scan${syncedCount === 1 ? "" : "s"} synced`,
      })
      await refreshRecentScans()
    } catch {
      setResult({
        valid: false,
        status: "error",
        message: "Unable to sync offline scans. Nothing was removed from the queue.",
      })
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
  const inputLabel = inputMode === "tapband" ? "TapBand code" : "Ticket code"
  const inputPlaceholder = inputMode === "tapband" ? "Tap or enter TapBand reference" : "Scan or enter code"
  const desktopInputPlaceholder = inputMode === "tapband" ? "Tap or paste TapBand reference" : "Scan or paste ticket code"
  const validationLabel = inputMode === "tapband" ? "Validate TapBand" : "Validate ticket"
  const modeIcon = inputMode === "tapband" ? "nfc" : "qr"
  const renderScannerModeControl = () => (
    <ScanModeToggle
      value={inputMode}
      onChange={(mode) => {
        setInputMode(mode)
        setResult(null)
        setCode("")
        if (mode === "qr") {
          stopNfcReader()
          setNfcStatus(null)
        }
      }}
    />
  )
  const renderNfcControl = () =>
    inputMode === "tapband" ? (
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={handleNfcRead} variant="outline" size="sm" disabled={loading}>
          <Icon name="nfc" size={14} />
          {nfcListening ? "Listening" : "Read band"}
        </Button>
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
          {nfcStatus ?? (nfcSupported ? "NFC ready" : "Manual fallback")}
        </span>
      </div>
    ) : null
  const renderCameraControl = () =>
    inputMode === "qr" ? (
      <Button onClick={() => void openCamera()} variant="accent" size="md" block disabled={loading}>
        <Icon name="qr" size={16} />
        Scan QR with camera
      </Button>
    ) : null
  const handlePrimaryValidation = () => {
    if (inputMode === "tapband") return handleTapBandScan()
    return handleScan(code)
  }

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
              {renderScannerModeControl()}
              <div className="flex items-center gap-2 text-ink-3">
                <Icon name={modeIcon} size={16} />
                <span className="text-label">{inputLabel}</span>
              </div>
              {renderNfcControl()}
              {renderCameraControl()}
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder={inputPlaceholder}
                className={cn(fieldClass, "h-12 text-[16px]")}
                autoFocus
              />
            </CardBody>
          </Card>
          <Button
            onClick={handlePrimaryValidation}
            disabled={loading || !code.trim()}
            variant="primary"
            size="md"
            block
            className="h-14 text-[16px]"
          >
            {loading ? "Validating…" : validationLabel}
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
                {renderScannerModeControl()}
                <div className="flex items-center gap-2">
                  <Icon name={modeIcon} size={18} className="text-ink-3" />
                  <p className="text-h3">{inputMode === "tapband" ? "TapBand entry" : "Manual entry"}</p>
                </div>
                {renderNfcControl()}
                {renderCameraControl()}
                <label className="flex flex-col gap-1">
                  <span className="text-label">{inputLabel}</span>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder={desktopInputPlaceholder}
                    className={cn(fieldClass, "font-mono")}
                  />
                </label>
                <Button onClick={handlePrimaryValidation} disabled={loading || !code.trim()} variant="primary" size="md" block>
                  {loading ? "Validating…" : validationLabel}
                </Button>
              </CardBody>
            </Card>
          </div>

          {resultBlock}

          {recentScansBlock}
        </div>
      </div>

      {cameraOpen && (
        <div
          className="fixed inset-0 z-[100] flex min-h-dvh flex-col bg-black text-white"
          role="dialog"
          aria-modal="true"
          aria-label="QR camera scanner"
        >
          <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold">Scan QR code</span>
              <span className="text-[11px] text-white/65">{selectedEvent.title}</span>
            </div>
            <button
              type="button"
              onClick={closeCamera}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25"
              aria-label="Close camera"
            >
              <Icon name="close" size={19} />
            </button>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <video
              ref={videoRef}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                cameraStatus !== "active" && "opacity-0",
              )}
              muted
              playsInline
              aria-label="Live rear-camera preview"
            />

            {cameraStatus === "active" && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-56 w-56 rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.42)] sm:h-72 sm:w-72" />
                </div>
                {!cameraPaused && (
                  <p className="absolute inset-x-4 bottom-5 text-center text-[13px] font-medium text-white drop-shadow">
                    Hold the attendee QR code inside the frame
                  </p>
                )}
              </>
            )}

            {cameraStatus !== "active" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <Icon name="qr" size={27} />
                </span>
                <p className="max-w-sm text-[14px] text-white/80">
                  {cameraMessage ?? "Starting camera…"}
                </p>
              </div>
            )}
          </div>

          {cameraPaused && result?.valid && (
            <div
              className={cn(
                "absolute inset-0 z-30 flex min-h-dvh flex-col overflow-hidden text-white",
                result.status === "offline" ? "bg-warning" : "bg-accent",
              )}
              role="status"
              aria-live="assertive"
            >
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute left-1/2 top-[42%] h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 motion-safe:animate-ping" />
                <div className="absolute left-1/2 top-[42%] h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15 motion-safe:animate-pulse" />
                <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
              </div>

              <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="relative mb-8 flex h-36 w-36 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-white/15 motion-safe:animate-pulse" />
                  <span
                    className={cn(
                      "relative inline-flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-2xl motion-safe:animate-bounce",
                      result.status === "offline" ? "text-warning" : "text-accent",
                    )}
                  >
                    <Icon name={result.status === "offline" ? "clock" : "check"} size={58} />
                  </span>
                </div>
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.28em] text-white/75">
                  {result.status === "offline" ? "Entry accepted locally" : "Entry approved"}
                </p>
                <h2 className="mt-3 text-[42px] font-bold leading-none tracking-tight">
                  {result.status === "offline" ? "Pending sync" : "Ticket valid"}
                </h2>
                <p className="mt-4 max-w-sm text-[16px] font-medium text-white/85">
                  {result.status === "offline"
                    ? "Ticket is valid and may enter. Sync the queued scan to update the attendee’s ticket and dashboard."
                    : result.message || "This attendee is cleared to enter."}
                </p>
                {(result.scan?.scanned_at || result.checkedInAt) && (
                  <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-black/15 px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-white/80">
                    <Icon name="clock" size={13} />
                    {new Date(result.scan?.scanned_at ?? result.checkedInAt ?? "").toLocaleTimeString()}
                  </p>
                )}
              </div>

              <div className="relative flex flex-col gap-3 border-t border-white/20 bg-black/10 p-4 safe-area-bottom">
                <Button
                  onClick={handleScanNext}
                  disabled={loading}
                  variant="primary"
                  size="md"
                  block
                  className={cn(
                    "h-14 bg-white hover:bg-white/90",
                    result.status === "offline" ? "text-warning" : "text-accent",
                  )}
                >
                  Scan next ticket
                </Button>
                <Button
                  onClick={closeCamera}
                  variant="outline"
                  size="md"
                  block
                  className="h-12 border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-line bg-surface p-4 text-ink safe-area-bottom">
            {cameraPaused && result?.valid ? null : cameraPaused ? (
              <>
                {result ? (
                  <ResultCard result={result} />
                ) : (
                  <div className="rounded-[var(--radius-md)] border border-line bg-bg px-4 py-3 text-[13px]">
                    {cameraMessage ?? "Validating ticket…"}
                  </div>
                )}
                <Button onClick={handleScanNext} disabled={loading} variant="accent" size="md" block>
                  {loading ? "Validating…" : "Scan next ticket"}
                </Button>
                <Button onClick={closeCamera} variant="outline" size="md" block>
                  Done
                </Button>
              </>
            ) : cameraStatus === "active" ? (
              <Button onClick={closeCamera} variant="outline" size="md" block>
                Close camera
              </Button>
            ) : (
              <>
                {(cameraStatus === "denied" || cameraStatus === "error") && (
                  <Button onClick={() => void openCamera()} variant="accent" size="md" block>
                    Try camera again
                  </Button>
                )}
                <Button onClick={closeCamera} variant="outline" size="md" block>
                  Enter code manually
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ScanModeToggle({
  value,
  onChange,
}: {
  value: ScannerInputMode
  onChange: (mode: ScannerInputMode) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-md)] border border-line bg-bg p-1" role="tablist">
      {(["qr", "tapband"] as const).map((mode) => {
        const active = value === mode
        return (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] text-[12px] font-semibold transition-colors",
              active ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon name={mode === "tapband" ? "nfc" : "qr"} size={13} />
            {mode === "tapband" ? "TapBand" : "QR"}
          </button>
        )
      })}
    </div>
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
        {!result.scan?.scanned_at && result.checkedInAt && (
          <p className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider opacity-70">
            <Icon name="clock" size={12} />
            {new Date(result.checkedInAt).toLocaleString()}
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
