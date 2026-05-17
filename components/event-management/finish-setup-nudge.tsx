"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

type SetupStatus = {
  needsLineup: boolean
  needsPolicies: boolean
  needsOps: boolean
}

/**
 * Post-publish callout that nudges organisers to complete the sections that
 * are no longer part of the creation wizard (lineup, policies, operations).
 * Dismiss state is stored per-event in localStorage — no backend needed.
 */
export function FinishSetupNudge({
  eventId,
  dismissed,
  onDismiss,
}: {
  eventId: string
  dismissed: boolean
  onDismiss: () => void
}) {
  const [status, setStatus] = useState<SetupStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [lineupRes, opsRes] = await Promise.all([
          fetch(`/api/events/${eventId}/lineup`, { cache: "no-store" }),
          fetch(`/api/events/${eventId}/ops`, { cache: "no-store" }),
        ])
        const lineup = await lineupRes.json().catch(() => ({}))
        const ops = await opsRes.json().catch(() => ({}))
        if (cancelled) return
        setStatus({
          needsLineup: (lineup.lineup?.length ?? 0) === 0,
          needsPolicies: !ops.event?.refund_policy && !ops.event?.confirmation_message,
          needsOps: (ops.metrics?.staff_count ?? 0) === 0,
        })
      } catch {
        if (!cancelled) setStatus(null)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  if (dismissed || !status) return null
  if (!status.needsLineup && !status.needsPolicies && !status.needsOps) return null

  const pills = [
    { show: status.needsLineup, label: "Add your lineup", tab: "lineup" },
    { show: status.needsPolicies, label: "Review your policies", tab: "policies" },
    { show: status.needsOps, label: "Configure operations", tab: "operations" },
  ].filter((pill) => pill.show)

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Your event is live</p>
            <p className="text-sm text-muted-foreground">
              Complete your setup: add your lineup, review your policies, and configure operations.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {pills.map((pill) => (
                <Button key={pill.tab} asChild size="sm" variant="outline" onClick={onDismiss}>
                  <Link href={`?tab=${pill.tab}`} scroll={false}>
                    {pill.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Dismiss setup reminder"
          onClick={onDismiss}
          className="self-start sm:self-center"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
