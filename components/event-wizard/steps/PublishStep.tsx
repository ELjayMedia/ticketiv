"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, AlertCircle } from "lucide-react"

export function PublishStep({ event, onSaving }: { event: any; onSaving: () => void }) {
  const [currentEvent, setCurrentEvent] = useState(event)
  const [readiness, setReadiness] = useState<{ ready: boolean; checks: Array<{ key: string; label: string; complete: boolean; recommended?: boolean }> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadPublishState()
  }, [event?.id])

  async function loadPublishState() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/events/${event.id}/publish`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load publish state")
      setCurrentEvent(payload.event)
      setReadiness(payload.readiness)
    } catch (err: any) {
      console.error("[v0] Error loading publish state:", err)
      setError(err?.message || "Failed to load publish state")
    } finally {
      setLoading(false)
    }
  }

  async function togglePublish() {
    try {
      setSaving(true)
      setError("")
      onSaving()

      const publish = currentEvent?.status !== "published"
      const response = await fetch(`/api/events/${event.id}/publish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to update publish state")

      setCurrentEvent(payload.event)
      setReadiness(payload.readiness)
    } catch (err: any) {
      console.error("[v0] Error toggling publish:", err)
      setError(err?.message || "Failed to update publish state")
      if (err?.readiness) setReadiness(err.readiness)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading publish checklist...</div>

  const published = currentEvent?.status === "published"
  const ready = Boolean(readiness?.ready)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">Publish event</h3>
            <p className="text-sm text-muted-foreground">
              Make this event visible to the public once the required setup is complete.
            </p>
          </div>
          <Button onClick={togglePublish} variant={published ? "destructive" : "default"} disabled={saving || (!published && !ready)}>
            {saving ? "Updating..." : published ? "Unpublish" : "Publish"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={published ? "default" : "secondary"}>{published ? "Published" : "Draft"}</Badge>
          <Badge variant={ready ? "default" : "outline"}>{ready ? "Ready" : "Not ready"}</Badge>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          {ready ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <h3 className="font-medium">Readiness checklist</h3>
        </div>

        <div className="space-y-2">
          {(readiness?.checks ?? []).map((check) => (
            <div key={check.key} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>{check.label}</span>
              <span className={check.complete ? "inline-flex items-center gap-2 font-medium" : "inline-flex items-center gap-2 text-muted-foreground"}>
                {check.complete ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                {check.complete ? "Complete" : check.recommended ? "Recommended" : "Missing"}
              </span>
            </div>
          ))}
        </div>

        {!ready && (
          <p className="text-sm text-muted-foreground">
            Complete the missing items in the previous steps before publishing.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
