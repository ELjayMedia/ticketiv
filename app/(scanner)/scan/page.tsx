"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ScanResponse {
  valid: boolean
  message: string
  ticketCode?: string
  eventTitle?: string
  scannedAt?: string
}

export default function ScannerPage() {
  const [code, setCode] = useState("")
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleScan = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/scanner/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()
      setResult(data)
    } finally {
      setLoading(false)
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
            {result.ticketCode && <p>Ticket Code: {result.ticketCode}</p>}
            {result.eventTitle && <p>Event: {result.eventTitle}</p>}
            {result.scannedAt && <p>Scanned at: {new Date(result.scannedAt).toLocaleString()}</p>}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
