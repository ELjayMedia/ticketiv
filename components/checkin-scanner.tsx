"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { CheckCircle2, AlertCircle, Zap, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckinResult {
  success: boolean
  data?: {
    id: string
    ticket_code: string
    checked_in_at?: string
  }
  error?: string
  already_checked_in?: boolean
}

interface CheckinHistory {
  ticket_code: string
  timestamp: string
  status: "success" | "duplicate" | "error"
  message: string
}

export function CheckinScanner() {
  const params = useParams()
  const eventId = params.eventId as string

  const [qrInput, setQrInput] = useState("")
  const [history, setHistory] = useState<CheckinHistory[]>([])
  const [totalCheckedIn, setTotalCheckedIn] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Subscribe to realtime updates for check-ins
  useEffect(() => {
    const supabase = createClientSupabaseClient()
    if (!supabase) return

    // Subscribe to order_items changes for this event
    const channel = supabase
      .channel(`event-${eventId}-checkins`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "order_items",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.new.checked_in_at && !payload.old.checked_in_at) {
            console.log("[v0] Realtime check-in received:", payload.new.ticket_code)
            setTotalCheckedIn((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  // Fetch initial check-in count
  useEffect(() => {
    const fetchCheckInCount = async () => {
      const supabase = createClientSupabaseClient()
      if (!supabase) return

      const { count, error } = await supabase
        .from("order_items")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .not("checked_in_at", "is", null)

      if (!error && count !== null) {
        setTotalCheckedIn(count)
      }
    }

    fetchCheckInCount()
  }, [eventId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!qrInput.trim()) {
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_token: qrInput.trim() }),
      })

      const result: CheckinResult = await response.json()
      setLastResult(result)

      if (response.ok && result.success) {
        const historyEntry: CheckinHistory = {
          ticket_code: result.data?.ticket_code || qrInput,
          timestamp: new Date().toLocaleTimeString(),
          status: "success",
          message: "Checked in successfully",
        }
        setHistory((prev) => [historyEntry, ...prev.slice(0, 19)])
      } else if (result.already_checked_in) {
        const historyEntry: CheckinHistory = {
          ticket_code: result.data?.ticket_code || qrInput,
          timestamp: new Date().toLocaleTimeString(),
          status: "duplicate",
          message: "Already checked in",
        }
        setHistory((prev) => [historyEntry, ...prev.slice(0, 19)])
      } else {
        const historyEntry: CheckinHistory = {
          ticket_code: qrInput,
          timestamp: new Date().toLocaleTimeString(),
          status: "error",
          message: result.error || "Check-in failed",
        }
        setHistory((prev) => [historyEntry, ...prev.slice(0, 19)])
      }

      setQrInput("")
    } catch (error) {
      console.error("[v0] Check-in error:", error)
      const historyEntry: CheckinHistory = {
        ticket_code: qrInput,
        timestamp: new Date().toLocaleTimeString(),
        status: "error",
        message: "Network error",
      }
      setHistory((prev) => [historyEntry, ...prev.slice(0, 19)])
    } finally {
      setIsProcessing(false)
      inputRef.current?.focus()
    }
  }

  const lastCheckin = history[0]
  const statusColor = !lastCheckin
    ? "bg-background"
    : lastCheckin.status === "success"
      ? "bg-green-50 border-green-200"
      : lastCheckin.status === "duplicate"
        ? "bg-yellow-50 border-yellow-200"
        : "bg-red-50 border-red-200"

  const statusIcon = !lastCheckin
    ? null
    : lastCheckin.status === "success"
      ? (
        <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
      )
      : lastCheckin.status === "duplicate"
        ? (
          <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
        )
        : (
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner Input */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Scan a ticket QR code or paste the ticket code to check in attendees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Scan or paste QR code here..."
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  disabled={isProcessing}
                  className="text-lg font-mono"
                  autoFocus
                  autoComplete="off"
                />
                <Button type="submit" className="w-full" disabled={isProcessing || !qrInput.trim()}>
                  {isProcessing ? "Processing..." : "Check In"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Feedback Card */}
          {lastCheckin && (
            <Card className={cn("border-2 transition-all", statusColor)}>
              <CardContent className="pt-6 text-center">
                {statusIcon}
                <p className="font-semibold text-lg mb-1">
                  {lastCheckin.status === "success"
                    ? "Checked In!"
                    : lastCheckin.status === "duplicate"
                      ? "Already Checked In"
                      : "Error"}
                </p>
                <p className="text-sm text-muted-foreground mb-2">{lastCheckin.message}</p>
                <Badge
                  variant={
                    lastCheckin.status === "success"
                      ? "default"
                      : lastCheckin.status === "duplicate"
                        ? "secondary"
                        : "destructive"
                  }
                  className="text-xs font-mono"
                >
                  {lastCheckin.ticket_code.substring(0, 20)}...
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Checked In</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{totalCheckedIn}</div>
              <p className="text-xs text-muted-foreground mt-2">attendees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No activity yet</p>
                ) : (
                  history.map((entry, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-xs p-2 rounded border",
                        entry.status === "success"
                          ? "bg-green-50 border-green-200 text-green-900"
                          : entry.status === "duplicate"
                            ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                            : "bg-red-50 border-red-200 text-red-900"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono truncate flex-1">{entry.ticket_code.substring(0, 12)}...</span>
                        <span className="text-xs opacity-75 shrink-0">{entry.timestamp}</span>
                      </div>
                      <p className="mt-1 opacity-75">{entry.message}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
