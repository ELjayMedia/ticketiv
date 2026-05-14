"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, RotateCcw, ScanLine, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ScanResult = {
  outcome: string
  message: string
  ticket?: { id: string; code: string; type: string; checked_in_at: string }
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
      setResult({ outcome: payload.outcome || (response.ok ? "valid" : "invalid"), message: payload.message || payload.error || "Scan complete", ticket: payload.ticket })
      if (response.ok) setTicketCode("")
    } catch (error: any) {
      setResult({ outcome: "invalid", message: error?.message || "Scan failed" })
    } finally {
      setLoading(false)
    }
  }

  const isValid = result?.outcome === "valid"

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/orgs/${orgId}/events/${eventId}/edit?step=staff`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold">Event scanner</h1>
            <p className="text-sm text-muted-foreground">Manual ticket-code check-in</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5" /> Scan ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={scanTicket} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticketCode">Ticket code</Label>
                <Input id="ticketCode" autoFocus placeholder="TIV-..." value={ticketCode} onChange={(event) => setTicketCode(event.target.value)} disabled={loading} className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gate">Gate optional</Label>
                <Input id="gate" placeholder="Main gate" value={gate} onChange={(event) => setGate(event.target.value)} disabled={loading} />
              </div>
              <Button type="submit" disabled={loading || !ticketCode.trim()} className="h-12 w-full gap-2">
                <ScanLine className="h-4 w-4" />
                {loading ? "Checking..." : "Check in ticket"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {result && (
          <Card className={isValid ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start gap-3">
                {isValid ? <CheckCircle2 className="mt-0.5 h-6 w-6 text-primary" /> : <XCircle className="mt-0.5 h-6 w-6 text-destructive" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{isValid ? "Valid ticket" : "Check failed"}</h2>
                    <Badge variant={isValid ? "default" : "destructive"}>{result.outcome}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{result.message}</p>
                  {result.ticket && (
                    <div className="mt-3 rounded-lg bg-background p-3 text-sm">
                      <p><span className="text-muted-foreground">Type:</span> {result.ticket.type}</p>
                      <p><span className="text-muted-foreground">Code:</span> {result.ticket.code}</p>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => { setResult(null); setTicketCode("") }} className="w-full gap-2">
                <RotateCcw className="h-4 w-4" /> Next scan
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
