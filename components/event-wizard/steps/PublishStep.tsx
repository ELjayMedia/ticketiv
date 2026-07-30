"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type ReadinessCheck = {
  key: string
  label: string
  complete: boolean
  recommended?: boolean
  hint?: string
  step?: string
}

type ReadinessState = {
  ready: boolean
  checks: ReadinessCheck[]
}

export function PublishStep({ event, onSaving }: { event: any; onSaving: () => void }) {
  const [currentEvent, setCurrentEvent] = useState(event)
  const [readiness, setReadiness] = useState<ReadinessState | null>(null)
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
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load publish state")
      setCurrentEvent(payload.event)
      setReadiness(payload.readiness)
    } catch (loadError: any) {
      console.error("[event-wizard] Error loading publish state:", loadError)
      setError(loadError?.message || "Failed to load publish state")
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

      const payload = await response.json().catch(() => ({}))
      if (payload.readiness) setReadiness(payload.readiness)
      if (!response.ok) throw new Error(payload.error || "Failed to update publish state")

      setCurrentEvent(payload.event)
    } catch (saveError: any) {
      console.error("[event-wizard] Error toggling publish:", saveError)
      setError(saveError?.message || "Failed to update publish state")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading publish state…</div>

  const published = currentEvent?.status === "published"
  const ready = Boolean(readiness?.ready)
  const blockers = (readiness?.checks ?? []).filter((check) => !check.recommended && !check.complete)
  const firstBlocker = blockers[0]
  const firstBlockerHref = firstBlocker?.step ? `?step=${firstBlocker.step}` : null

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Publish event</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The readiness checklist alongside the wizard is the single source of truth for going live.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium">Public availability</h3>
              <Badge variant={published ? "default" : "secondary"}>{published ? "Published" : "Draft"}</Badge>
              <Badge variant={ready ? "default" : "outline"}>{ready ? "Ready" : `${blockers.length} required left`}</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {published
                ? "This event is currently visible through its public event page."
                : ready
                  ? "All required publication checks are complete."
                  : "Complete the remaining required items before publishing."}
            </p>
          </div>

          <Button
            onClick={togglePublish}
            variant={published ? "destructive" : "default"}
            disabled={saving || (!published && !ready)}
          >
            {saving ? "Updating…" : published ? "Unpublish" : "Publish event"}
          </Button>
        </div>
      </div>

      {ready ? (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-medium">Required setup complete</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Recommended event-day items can still be completed after publishing.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Publication is blocked by {blockers.length} required item{blockers.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the Fix actions in the readiness checklist. They open the exact wizard step or workspace screen needed.
              </p>
              {firstBlocker && firstBlockerHref ? (
                <Link
                  href={firstBlockerHref}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-600/30 px-3 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-500/10"
                >
                  Fix {firstBlocker.label.toLowerCase()}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
