"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, CircleDashed, Rocket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type ReadinessItem = {
  key: string
  label: string
  complete: boolean
  hint?: string
}

export function EventReadinessPanel({ eventId, refreshKey }: { eventId: string; refreshKey?: number }) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReadinessItem[]>([])
  const [publishEligible, setPublishEligible] = useState(false)

  useEffect(() => {
    loadReadiness()
  }, [eventId, refreshKey])

  async function loadReadiness() {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${eventId}/ops`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load readiness")

      setItems(payload.readiness ?? [])
      setPublishEligible(Boolean(payload.publishEligible))
    } catch (error) {
      console.error("[v0] Failed to load readiness", error)
    } finally {
      setLoading(false)
    }
  }

  const completion = useMemo(() => {
    if (!items.length) return 0
    return Math.round((items.filter((item) => item.complete).length / items.length) * 100)
  }, [items])

  return (
    <Card className="sticky top-4 border-border/60 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Event readiness</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Track what still needs to be completed before your event can safely go live.</p>
          </div>
          {publishEligible ? (
            <Badge className="gap-1"><Rocket className="h-3 w-3" /> Ready</Badge>
          ) : (
            <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> In progress</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Completion</span>
            <span className="text-muted-foreground">{completion}%</span>
          </div>
          <Progress value={completion} />
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading readiness…</div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.key} className="rounded-lg border p-3">
                <div className="flex items-start gap-3">
                  {item.complete ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.label}</p>
                      <Badge variant={item.complete ? "default" : "outline"}>{item.complete ? "Complete" : "Pending"}</Badge>
                    </div>

                    {item.hint ? (
                      <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
