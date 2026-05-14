"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function toLocalInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export function ScheduleStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [tz, setTz] = useState("Africa/Mbabane")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadSchedule()
  }, [eventId])

  async function loadSchedule() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/schedule`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load schedule")
      setStartsAt(toLocalInputValue(payload.event?.starts_at))
      setEndsAt(toLocalInputValue(payload.event?.ends_at))
      setTz(payload.event?.tz || "Africa/Mbabane")
    } catch (err: any) {
      console.error("[v0] Error loading schedule:", err)
      setError(err?.message || "Failed to load schedule")
    } finally {
      setLoading(false)
    }
  }

  async function saveSchedule() {
    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starts_at: startsAt, ends_at: endsAt, tz }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save schedule")
      setStartsAt(toLocalInputValue(payload.event?.starts_at))
      setEndsAt(toLocalInputValue(payload.event?.ends_at))
      setTz(payload.event?.tz || "Africa/Mbabane")
    } catch (err: any) {
      console.error("[v0] Error saving schedule:", err)
      setError(err?.message || "Failed to save schedule")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading schedule...</div>

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Set the main event date and time. This also creates the matching event date row used by publish readiness and future multi-date events.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Starts *</label>
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-2" disabled={saving} />
        </div>
        <div>
          <label className="text-sm font-medium">Ends *</label>
          <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-2" disabled={saving} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Timezone</label>
        <Input value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Africa/Mbabane" className="mt-2" disabled={saving} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={saveSchedule} disabled={saving || !startsAt || !endsAt} className="w-full">
        {saving ? "Saving schedule..." : "Save schedule"}
      </Button>
    </div>
  )
}
