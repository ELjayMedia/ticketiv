"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Rocket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const WIZARD_STEPS = new Set(["basics", "lineup", "schedule", "venue", "tickets", "policies", "publish"])

type ReadinessItem = {
  key: string
  label: string
  complete: boolean
  recommended: boolean
  hint: string
  step: string
}

type ReadinessAction = {
  href: string
  label: string
}

function actionFor(item: ReadinessItem, orgId: string, eventId: string): ReadinessAction | null {
  if (WIZARD_STEPS.has(item.step)) {
    const labels: Record<string, string> = {
      image: "Upload image",
      payment_method: "Configure",
      policy: "Add policy",
      title: "Edit basics",
      category: "Choose category",
      lineup: "Add lineup",
      date: "Set dates",
      venue: "Choose venue",
      tickets: "Add tickets",
      online_channel: "Enable online sales",
      live_stats: "Review tickets",
    }
    return { href: `?step=${item.step}`, label: labels[item.key] ?? "Fix in wizard" }
  }

  if (item.step === "finance") {
    return { href: `/orgs/${orgId}/payouts/accounts`, label: "Connect payout account" }
  }

  if (item.step === "staff") {
    return { href: `/orgs/${orgId}/events/${eventId}/staff`, label: "Manage check-in staff" }
  }

  return null
}

export function EventReadinessPanel({
  orgId,
  eventId,
  refreshKey,
}: {
  orgId: string
  eventId: string
  refreshKey?: number
}) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReadinessItem[]>([])
  const [publishEligible, setPublishEligible] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadReadiness() {
      try {
        setLoading(true)
        setError("")
        const response = await fetch(`/api/events/${eventId}/publish`, { cache: "no-store" })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || "Failed to load readiness")
        if (cancelled) return

        setItems(Array.isArray(payload.readiness?.checks) ? payload.readiness.checks : [])
        setPublishEligible(Boolean(payload.readiness?.ready))
      } catch (loadError: any) {
        console.error("[event-wizard] Failed to load readiness", loadError)
        if (!cancelled) setError(loadError?.message || "Failed to load readiness")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadReadiness()
    return () => {
      cancelled = true
    }
  }, [eventId, refreshKey])

  const completion = useMemo(() => {
    if (!items.length) return 0
    return Math.round((items.filter((item) => item.complete).length / items.length) * 100)
  }, [items])

  const requiredItems = items.filter((item) => !item.recommended)
  const recommendedItems = items.filter((item) => item.recommended)
  const requiredRemaining = requiredItems.filter((item) => !item.complete).length
  const completeCount = items.filter((item) => item.complete).length

  function renderGroup(title: string, groupItems: ReadinessItem[]) {
    if (groupItems.length === 0) return null

    return (
      <section className="space-y-2" aria-label={title}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">
            {groupItems.filter((item) => item.complete).length}/{groupItems.length}
          </span>
        </div>

        {groupItems.map((item) => {
          const action = item.complete ? null : actionFor(item, orgId, eventId)
          return (
            <div key={item.key} className="rounded-lg border p-3">
              <div className="flex items-start gap-3">
                {item.complete ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Badge variant={item.complete ? "default" : "outline"}>
                      {item.complete ? "Complete" : item.recommended ? "Recommended" : "Required"}
                    </Badge>
                  </div>

                  {!item.complete && item.hint ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.hint}</p>
                  ) : null}

                  {action ? (
                    <Link
                      href={action.href}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      {action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </section>
    )
  }

  return (
    <Card className="border-border/60 bg-background/95 backdrop-blur lg:sticky lg:top-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Readiness checklist</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete the required items to publish, then finish the event-day recommendations.
            </p>
          </div>
          {publishEligible ? (
            <Badge className="gap-1"><Rocket className="h-3 w-3" /> Ready</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> {requiredRemaining} left</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall completion</span>
            <span className="text-muted-foreground">{completeCount}/{items.length || 0} · {completion}%</span>
          </div>
          <Progress value={completion} />
        </div>

        {loading ? <div className="text-sm text-muted-foreground">Loading readiness…</div> : null}
        {error ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}

        {!loading && !error ? (
          <div className="space-y-5">
            {renderGroup("Required before publishing", requiredItems)}
            {renderGroup("Recommended before event day", recommendedItems)}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
