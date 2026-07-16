"use client"

import { useRef, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import {
  normalizeCredentialPublicId,
  scannerResultFromPayload,
  scannerStatusTitle,
  scannerStatusTone,
  shouldSuppressTapBandRead,
  type ScannerClientResult,
  type ScannerInputMode,
  type TapBandCooldownState,
} from "@/lib/scanner/client-results"

const TAPBAND_COOLDOWN_MS = 3500

type ReaderState = "idle" | "starting" | "ready" | "unsupported"

function cardClassForStatus(status: ScannerClientResult["status"]) {
  const tone = scannerStatusTone(status)
  if (tone === "success") return "border-accent/40 bg-accent-soft"
  if (tone === "warning") return "border-warning/40 bg-warning/5"
  return "border-danger/40 bg-danger-soft"
}

function OutcomeIcon({ status }: { status: ScannerClientResult["status"] }) {
  const tone = scannerStatusTone(status)
  if (tone === "success") return <Icon name="check" size={22} className="mt-0.5 text-accent" />
  if (tone === "warning") return <Icon name="bell" size={22} className="mt-0.5 text-warning" />
  return <Icon name="close" size={22} className="mt-0.5 text-danger" />
}

function createAttemptId(mode: ScannerInputMode) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${mode}-${crypto.randomUUID()}`
  }
  return `${mode}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function decodeNfcRecord(record: { data?: BufferSource; encoding?: string }) {
  if (!record.data) return ""
  try {
    return new TextDecoder(record.encoding || "utf-8").decode(record.data)
  } catch {
    return ""
  }
}

function credentialFromNfcEvent(event: unknown) {
  const records = (event as { message?: { records?: Array<{ data?: BufferSource; encoding?: string }> } })?.message?.records ?? []
  for (const record of records) {
    const credential = normalizeCredentialPublicId(decodeNfcRecord(record))
    if (credential) return credential
  }
  return ""
}

export function ScannerClient({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [mode, setMode] = useState<ScannerInputMode>("qr")
  const [ticketCode, setTicketCode] = useState("")
  const [credentialPublicId, setCredentialPublicId] = useState("")
  const [gate, setGate] = useState("")
  const [loading, setLoading] = useState(false)
  const [readerState, setReaderState] = useState<ReaderState>("idle")
  const [result, setResult] = useState<ScannerClientResult | null>(null)
  const lastTapRef = useRef<TapBandCooldownState | null>(null)

  async function submitScan(inputMode: ScannerInputMode, rawValue: string) {
    const normalizedValue = inputMode === "tapband" ? normalizeCredentialPublicId(rawValue) : rawValue.trim()
    if (!normalizedValue) return

    const now = Date.now()
    if (inputMode === "tapband" && shouldSuppressTapBandRead(lastTapRef.current, normalizedValue, now, TAPBAND_COOLDOWN_MS)) {
      setResult({
        valid: false,
        status: "duplicate",
        inputMode: "tapband",
        message: "Same TapBand read again inside cooldown. Move the band away before retrying.",
        idempotent: true,
      })
      return
    }

    const attemptId = createAttemptId(inputMode)
    if (inputMode === "tapband") {
      lastTapRef.current = { credentialPublicId: normalizedValue, attemptedAt: now, attemptId }
    }

    setLoading(true)
    setResult(null)
    try {
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputMode === "tapband"
          ? {
              mode: "tapband",
              eventId,
              credentialPublicId: normalizedValue,
              gate: gate.trim() || null,
              attemptId,
              scannedAt: new Date().toISOString(),
            }
          : {
              mode: "qr",
              eventId,
              code: normalizedValue,
              gate: gate.trim() || null,
              attemptId,
              scannedAt: new Date().toISOString(),
            }),
      })
      const payload = await response.json().catch(() => ({}))
      const nextResult = scannerResultFromPayload(payload, response.ok, inputMode)
      setResult(nextResult)
      if (nextResult.valid) {
        if (inputMode === "tapband") setCredentialPublicId("")
        else setTicketCode("")
      }
    } catch (error: any) {
      setResult({
        valid: false,
        status: inputMode === "tapband" ? "tapband_reader_error" : "error",
        inputMode,
        message: error?.message || "Scan failed",
      })
    } finally {
      setLoading(false)
    }
  }

  async function scanTicket(event: React.FormEvent) {
    event.preventDefault()
    await submitScan(mode, mode === "tapband" ? credentialPublicId : ticketCode)
  }

  async function startNfcReader() {
    if (typeof window === "undefined" || !("NDEFReader" in window)) {
      setReaderState("unsupported")
      setResult({
        valid: false,
        status: "tapband_reader_error",
        inputMode: "tapband",
        message: "NFC reader is not available on this device.",
      })
      return
    }

    setMode("tapband")
    setReaderState("starting")
    setResult(null)
    try {
      const reader = new (window as unknown as { NDEFReader: new () => { scan: () => Promise<void>; onreading?: (event: unknown) => void; onreadingerror?: () => void } }).NDEFReader()
      await reader.scan()
      reader.onreading = (event: unknown) => {
        const credential = credentialFromNfcEvent(event)
        if (!credential) {
          setResult({
            valid: false,
            status: "tapband_reader_error",
            inputMode: "tapband",
            message: "TapBand could not be read. Try again or use QR fallback.",
          })
          return
        }
        setCredentialPublicId(credential)
        void submitScan("tapband", credential)
      }
      reader.onreadingerror = () => {
        setResult({
          valid: false,
          status: "tapband_reader_error",
          inputMode: "tapband",
          message: "TapBand was removed before it could be read.",
        })
      }
      setReaderState("ready")
    } catch (error: any) {
      setReaderState("idle")
      setResult({
        valid: false,
        status: "tapband_reader_error",
        inputMode: "tapband",
        message: error?.message || "Unable to start NFC reader.",
      })
    }
  }

  const canSubmit = mode === "tapband" ? credentialPublicId.trim() : ticketCode.trim()

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto flex max-w-xl flex-col gap-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}/staff`}
            aria-label="Back to staff"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={18} />
          </Link>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-h2">Event scanner</h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
              QR + TapBand check-in
            </p>
          </div>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name="qr" size={18} className="text-ink-3" />
              <p className="text-h3">{mode === "tapband" ? "Scan TapBand" : "Scan ticket"}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["qr", "tapband"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { setMode(item); setResult(null) }}
                  className={cn(
                    "inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius)] border px-3 text-sm font-semibold transition-colors",
                    mode === item ? "border-ink bg-ink text-surface" : "border-line-2 bg-surface text-ink hover:bg-bg",
                  )}
                >
                  <Icon name={item === "tapband" ? "spark" : "qr"} size={14} />
                  {item === "tapband" ? "TapBand" : "QR"}
                </button>
              ))}
            </div>

            <form onSubmit={scanTicket} className="flex flex-col gap-4">
              {mode === "tapband" ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <FormField
                      label="TapBand credential"
                      autoFocus
                      placeholder="Credential public ID"
                      value={credentialPublicId}
                      onChange={(event) => setCredentialPublicId(event.target.value)}
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={startNfcReader}
                      disabled={loading || readerState === "starting"}
                      className="mt-6 h-10"
                    >
                      <Icon name="spark" size={14} />
                      {readerState === "starting" ? "Starting" : readerState === "ready" ? "Ready" : "NFC"}
                    </Button>
                  </div>
                  {readerState === "unsupported" ? (
                    <p className="font-mono text-[11px] text-ink-3">
                      NFC unavailable on this device.
                    </p>
                  ) : readerState === "ready" ? (
                    <p className="font-mono text-[11px] text-success">
                      Reader ready.
                    </p>
                  ) : null}
                </div>
              ) : (
                <FormField
                  label="Ticket code"
                  autoFocus
                  placeholder="TIV-..."
                  value={ticketCode}
                  onChange={(event) => setTicketCode(event.target.value)}
                  disabled={loading}
                />
              )}
              <FormField
                label="Gate (optional)"
                placeholder="Main gate"
                value={gate}
                onChange={(event) => setGate(event.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !canSubmit}
                variant="primary"
                size="md"
                block
                className="h-12"
              >
                <Icon name={mode === "tapband" ? "spark" : "qr"} size={14} />
                {loading ? "Checking..." : mode === "tapband" ? "Check TapBand" : "Check in ticket"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {result && (
          <Card className={cn(cardClassForStatus(result.status))}>
            <CardBody className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <OutcomeIcon status={result.status} />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-ink">{scannerStatusTitle(result.status, result.inputMode)}</h2>
                    <Chip size="sm" variant="muted">{result.status}</Chip>
                    <Chip size="sm" variant="muted">{result.inputMode}</Chip>
                  </div>
                  <p className="text-[13px] text-ink-3">{result.message}</p>
                  {(result.ticketTypeName || result.orderItemId || result.checkedInAt) && (
                    <div className="mt-2 flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface p-3 text-[12px]">
                      {result.ticketTypeName ? <p><span className="text-ink-3">Type:</span> {result.ticketTypeName}</p> : null}
                      {result.orderItemId ? <p><span className="text-ink-3">Ticket:</span> <span className="font-mono">{result.orderItemId}</span></p> : null}
                      {result.checkedInAt ? (
                        <p>
                          <span className="text-ink-3">Checked in:</span>{" "}
                          {new Date(result.checkedInAt).toLocaleString()}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={() => { setResult(null); if (mode === "tapband") setCredentialPublicId(""); else setTicketCode("") }}
                block
              >
                <Icon name="arrowR" size={14} />
                Next scan
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  )
}
