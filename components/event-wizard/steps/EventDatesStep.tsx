"use client"

import { useEffect, useState } from "react"
import { CalendarDays, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function EventDatesStep({ eventId }: { eventId: string }) {
  const [dates, setDates] = useState<Array<{ starts_at: string; ends_at: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadDates()
  }, [eventId])

  async function loadDates() {
    setLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}/dates`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load dates")
      setDates(payload.dates?.length ? payload.dates : [{ starts_at: "", ends_at: "" }])
    } catch (err: any) {
      setError(err?.message || "Failed to load event dates")
    } finally {
      setLoading(false)
    }
  }

  function updateDate(index: number, field: "starts_at" | "ends_at", value: string) {
    setDates((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  function addDate() {
    setDates((current) => [...current, { starts_at: "", ends_at: "" }])
  }

  function removeDate(index: number) {
    setDates((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function saveDates() {
    try {
      setSaving(true)
      setError("")

      const response = await fetch(`/api/events/${eventId}/dates`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save dates")
      setDates(payload.dates ?? [])
    } catch (err: any) {
      setError(err?.message || "Failed to save event dates")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading dates…</div>

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-muted/30 p-4">
        <div className="flex gap-3">
          <CalendarDays className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Multi-date scheduling</h3>
            <p className="mt-1 text-sm text-muted-foreground">Support festivals, conferences and multi-day experiences by adding multiple schedule blocks to the same event.</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {dates.map((date, index) => (
          <div key={`${index}-${date.starts_at}`} className="rounded-2xl border p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start</label>
                <Input type="datetime-local" value={date.starts_at ? date.starts_at.slice(0, 16) : ""} onChange={(e) => updateDate(index, "starts_at", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End</label>
                <Input type="datetime-local" value={date.ends_at ? date.ends_at.slice(0, 16) : ""} onChange={(e) => updateDate(index, "ends_at", e.target.value)} />
              </div>

              <Button type="button" variant="outline" size="icon" onClick={() => removeDate(index)} disabled={dates.length === 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addDate} className="w-full gap-2">
        <Plus className="h-4 w-4" /> Add another date
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button onClick={saveDates} disabled={saving} className="w-full">
        {saving ? "Saving dates…" : "Save event schedule"}
      </Button>
    </div>
  )
}
