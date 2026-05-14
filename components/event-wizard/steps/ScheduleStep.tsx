"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Plus, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type DateRow = {
  starts_at: string
  ends_at: string
}

function toLocalInputValue(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export function ScheduleStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [dates, setDates] = useState<DateRow[]>([{ starts_at: "", ends_at: "" }])
  const [tz, setTz] = useState("Africa/Mbabane")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadSchedule()
  }, [eventId])

  const isMultiDay = useMemo(() => dates.length > 1, [dates])

  async function loadSchedule() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/events/${eventId}/schedule`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load schedule")

      const nextDates = Array.isArray(payload.dates) && payload.dates.length > 0
        ? payload.dates.map((row: any) => ({ starts_at: toLocalInputValue(row.starts_at), ends_at: toLocalInputValue(row.ends_at) }))
        : [{ starts_at: toLocalInputValue(payload.event?.starts_at), ends_at: toLocalInputValue(payload.event?.ends_at) }]

      setDates(nextDates)
      setTz(payload.event?.tz || "Africa/Mbabane")
    } catch (err: any) {
      console.error("[v0] Error loading schedule:", err)
      setError(err?.message || "Failed to load schedule")
    } finally {
      setLoading(false)
    }
  }

  function updateDate(index: number, field: keyof DateRow, value: string) {
    setDates((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)))
  }

  function addDate() {
    setDates((prev) => [...prev, { starts_at: "", ends_at: "" }])
  }

  function removeDate(index: number) {
    setDates((prev) => (prev.length === 1 ? prev : prev.filter((_, rowIndex) => rowIndex !== index)))
  }

  async function saveSchedule() {
    try {
      setSaving(true)
      setError("")
      onSaving()

      const response = await fetch(`/api/events/${eventId}/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates, tz }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save schedule")

      const savedDates = Array.isArray(payload.dates) && payload.dates.length > 0
        ? payload.dates.map((row: any) => ({ starts_at: toLocalInputValue(row.starts_at), ends_at: toLocalInputValue(row.ends_at) }))
        : dates

      setDates(savedDates)
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
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5" />
          <div>
            <p className="font-medium text-foreground">Canonical event schedule</p>
            <p className="mt-1">The earliest event date becomes the canonical start date and the latest end date becomes the canonical end date for public browsing and checkout. Additional dates support future festival and multi-day event flows.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {dates.map((row, index) => (
          <div key={index} className="rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{isMultiDay ? `Session ${index + 1}` : "Main event schedule"}</p>
                <p className="text-xs text-muted-foreground">{index === 0 ? "Canonical start date" : "Additional festival/session date"}</p>
              </div>

              {dates.length > 1 ? (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeDate(index)} disabled={saving}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Starts *</label>
                <Input type="datetime-local" value={row.starts_at} onChange={(e) => updateDate(index, "starts_at", e.target.value)} className="mt-2" disabled={saving} />
              </div>

              <div>
                <label className="text-sm font-medium">Ends *</label>
                <Input type="datetime-local" value={row.ends_at} onChange={(e) => updateDate(index, "ends_at", e.target.value)} className="mt-2" disabled={saving} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addDate} className="w-full gap-2" disabled={saving}>
        <Plus className="h-4 w-4" /> Add another event date
      </Button>

      <div>
        <label className="text-sm font-medium">Timezone</label>
        <Input value={tz} onChange={(e) => setTz(e.target.value)} placeholder="Africa/Mbabane" className="mt-2" disabled={saving} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={saveSchedule} disabled={saving || dates.some((row) => !row.starts_at || !row.ends_at)} className="w-full">
        {saving ? "Saving schedule..." : isMultiDay ? "Save festival schedule" : "Save schedule"}
      </Button>
    </div>
  )
}
