"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Circle, Sparkles, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type SetupStatus = {
  hasLineup: boolean
  hasPolicies: boolean
  hasStaff: boolean
  hasGuestlist: boolean
  hasIssuedTickets: boolean
}

type ChecklistItem = {
  key: string
  label: string
  description: string
  complete: boolean
  required: boolean
  tab: string
  action: string
}

/**
 * Organizer-facing readiness checklist.
 *
 * This is intentionally a frontend-safe first pass: it reuses existing
 * event setup endpoints and does not change publish rules, RLS, or backend
 * policy. The checklist appears on the event overview and gives organizers a
 * clear path to finish setup before publishing pressure or event-day ops.
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
          hasLineup: (lineup.lineup?.length ?? 0) > 0,
          hasPolicies: Boolean(ops.event?.refund_policy || ops.event?.confirmation_message),
          hasStaff: (ops.metrics?.staff_count ?? 0) > 0,
          hasGuestlist: (ops.metrics?.guestlist_count ?? 0) > 0,
          hasIssuedTickets: (ops.metrics?.issued_tickets ?? 0) > 0,
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

  const items = useMemo<ChecklistItem[]>(() => {
    if (!status) return []
    return [
      {
        key: "tickets",
        label: "Ticket setup",
        description: "Confirm ticket tiers, quotas and sales status before promoting the event.",
        complete: status.hasIssuedTickets,
        required: true,
        tab: "tickets",
        action: status.hasIssuedTickets ? "Review tickets" : "Check tickets",
      },
      {
        key: "policies",
        label: "Policies and confirmations",
        description: "Set refund terms or confirmation copy so buyers know what to expect.",
        complete: status.hasPolicies,
        required: true,
        tab: "policies",
        action: status.hasPolicies ? "Review policies" : "Add policies",
      },
      {
        key: "lineup",
        label: "Lineup or programme",
        description: "Add performers, speakers or programme details to strengthen the public page.",
        complete: status.hasLineup,
        required: false,
        tab: "lineup",
        action: status.hasLineup ? "Review lineup" : "Add lineup",
      },
      {
        key: "staff",
        label: "Check-in staff",
        description: "Assign scanners and gate staff before event day.",
        complete: status.hasStaff,
        required: false,
        tab: "staff",
        action: status.hasStaff ? "Review staff" : "Assign staff",
      },
      {
        key: "guestlist",
        label: "Guestlist readiness",
        description: "Prepare complimentary or controlled-access entries if this event needs them.",
        complete: status.hasGuestlist,
        required: false,
        tab: "guestlist",
        action: status.hasGuestlist ? "Review guestlist" : "Open guestlist",
      },
    ]
  }, [status])

  if (dismissed || !status) return null

  const requiredItems = items.filter((item) => item.required)
  const recommendedItems = items.filter((item) => !item.required)
  const missingRequired = requiredItems.filter((item) => !item.complete).length
  const completeCount = items.filter((item) => item.complete).length

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            {missingRequired > 0 ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            ) : (
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">Event readiness checklist</p>
                <Badge variant={missingRequired > 0 ? "secondary" : "default"}>
                  {completeCount}/{items.length} ready
                </Badge>
                {missingRequired > 0 && (
                  <Badge variant="outline">{missingRequired} required pending</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Use this checklist to reduce incomplete event pages and avoid event-day issues. Required items should be handled before heavy promotion.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss readiness checklist"
            onClick={onDismiss}
            className="self-start sm:self-center"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <ChecklistGroup title="Required before promotion" items={requiredItems} />
          <ChecklistGroup title="Recommended before event day" items={recommendedItems} />
        </div>
      </CardContent>
    </Card>
  )
}

function ChecklistGroup({ title, items }: { title: string; items: ChecklistItem[] }) {
  return (
    <div className="rounded-lg border bg-background/70 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              {item.complete ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium leading-none">{item.label}</p>
                  <Badge variant={item.complete ? "default" : item.required ? "secondary" : "outline"}>
                    {item.complete ? "Ready" : item.required ? "Required" : "Recommended"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Button asChild size="sm" variant={item.complete ? "outline" : "default"}>
                <Link href={`?tab=${item.tab}`} scroll={false}>
                  {item.action}
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
