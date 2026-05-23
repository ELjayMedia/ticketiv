"use client"

import { useState } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"

type ScanOutcome =
  | "valid"
  | "already_used"
  | "wrong_event"
  | "unknown_ticket"
  | "revoked"
  | "refunded"
  | "transferred"
  | "not_issued"
  | "invalid"

type ScanResult = {
  outcome: ScanOutcome | string
  message: string
  ticket?: { id: string; code: string; type: string; checked_in_at: string }
}

const DANGER_OUTCOMES = new Set(["wrong_event", "unknown_ticket", "revoked", "refunded", "transferred", "invalid"])
const WARNING_OUTCOMES = new Set(["already_used", "not_issued"])

function outcomeTitle(outcome: string) {
  if (outcome === "valid") return "Valid ticket"
  if (outcome === "already_used") return "Already checked in"
  if (outcome === "wrong_event") return "Wrong event"
  if (outcome === "unknown_ticket") return "Unknown ticket"
  if (outcome === "revoked") return "Revoked ticket"
  if (outcome === "refunded") return "Refunded ticket"
  if (outcome === "transferred") return "Transferred ticket"
  if (outcome === "not_issued") return "Ticket not ready"
  return "Check failed"
}

function outcomeCardClass(outcome: string) {
  if (outcome === "valid") return "border-accent/40 bg-accent-soft"
  if (WARNING_OUTCOMES.has(outcome)) return "border-warning/40 bg-warning/5"
  return "border-danger/40 bg-danger-soft"
}

function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "valid") return <Icon name="check" size={22} className="mt-0.5 text-accent" />
  if (WARNING_OUTCOMES.has(outcome)) return <Icon name="bell" size={22} className="mt-0.5 text-warning" />
  return <Icon name="close" size={22} className="mt-0.5 text-danger" />
}

export function ScannerClient({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [ticketCode, setTicketCode] = useState("")
  const [gate, setGate] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)

  async function scanTicket(event: React.FormEvent) {
    event.preventDefault()
    if (!ticketCode.trim()) return

    setLoading(true)
    setResult(null)
    try {
      const response = await fetch(`/api/events/${eventId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_code: ticketCode.trim(), gate: gate.trim() || null }),
      })
      const payload = await response.json()
      setResult({
        outcome: payload.outcome || (response.ok ? "valid" : "invalid"),
        message: payload.message || payload.error || "Scan complete",
        ticket: payload.ticket,
      })
      if (response.ok) setTicketCode("")
    } catch (error: any) {
      setResult({ outcome: "invalid", message: error?.message || "Scan failed" })
    } finally {
      setLoading(false)
    }
  }

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
              Manual ticket-code check-in
            </p>
          </div>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name="qr" size={18} className="text-ink-3" />
              <p className="text-h3">Scan ticket</p>
            </div>
            <form onSubmit={scanTicket} className="flex flex-col gap-4">
              <FormField
                label="Ticket code"
                autoFocus
                placeholder="TIV-…"
                value={ticketCode}
                onChange={(event) => setTicketCode(event.target.value)}
                disabled={loading}
              />
              <FormField
                label="Gate (optional)"
                placeholder="Main gate"
                value={gate}
                onChange={(event) => setGate(event.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !ticketCode.trim()}
                variant="primary"
                size="md"
                block
                className="h-12"
              >
                <Icon name="qr" size={14} />
                {loading ? "Checking…" : "Check in ticket"}
              </Button>
            </form>
          </CardBody>
        </Card>

        {result && (
          <Card className={cn(outcomeCardClass(result.outcome))}>
            <CardBody className="flex flex-col gap-4 p-5">
              <div className="flex items-start gap-3">
                <OutcomeIcon outcome={result.outcome} />
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-ink">{outcomeTitle(result.outcome)}</h2>
                    <Chip size="sm" variant="muted">{result.outcome}</Chip>
                  </div>
                  <p className="text-[13px] text-ink-3">{result.message}</p>
                  {result.ticket && (
                    <div className="mt-2 flex flex-col gap-1 rounded-[var(--radius-md)] bg-surface p-3 text-[12px]">
                      <p><span className="text-ink-3">Type:</span> {result.ticket.type}</p>
                      <p><span className="text-ink-3">Code:</span> <span className="font-mono">{result.ticket.code}</span></p>
                      <p>
                        <span className="text-ink-3">Checked in:</span>{" "}
                        {new Date(result.ticket.checked_in_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="md"
                onClick={() => { setResult(null); setTicketCode("") }}
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
