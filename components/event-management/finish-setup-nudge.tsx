"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/cn"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

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
    <Card>
      <CardBody className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Icon
              name={missingRequired > 0 ? "zap" : "spark"}
              size={20}
              className="mt-0.5 shrink-0 text-accent"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">Event readiness checklist</p>
                <Chip size="sm" variant={missingRequired > 0 ? "muted" : "accent"}>
                  {completeCount}/{items.length} ready
                </Chip>
                {missingRequired > 0 && (
                  <Chip size="sm" variant="default">{missingRequired} required pending</Chip>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-3">
                Use this checklist to reduce incomplete event pages and avoid event-day issues. Required items should be handled before heavy promotion.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Dismiss readiness checklist"
            onClick={onDismiss}
            className="self-start sm:self-center"
          >
            <Icon name="close" size={16} />
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <ChecklistGroup title="Required before promotion" items={requiredItems} />
          <ChecklistGroup title="Recommended before event day" items={recommendedItems} />
        </div>
      </CardBody>
    </Card>
  )
}

function ChecklistGroup({ title, items }: { title: string; items: ChecklistItem[] }) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-bg p-3">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-ink-3">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-[var(--radius)] border border-line bg-surface p-3">
            <div className="flex items-start gap-3">
              <Icon
                name={item.complete ? "check" : "plus"}
                size={16}
                className={cn("mt-0.5 shrink-0", item.complete ? "text-accent" : "text-ink-3")}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium leading-none">{item.label}</p>
                  <Chip
                    size="sm"
                    variant={item.complete ? "accent" : item.required ? "muted" : "default"}
                  >
                    {item.complete ? "Ready" : item.required ? "Required" : "Recommended"}
                  </Chip>
                </div>
                <p className="mt-1 text-sm text-ink-3">{item.description}</p>
              </div>
              <Link
                href={`?tab=${item.tab}`}
                scroll={false}
                className="inline-flex items-center justify-center gap-1 font-semibold whitespace-nowrap rounded-[var(--radius)] leading-none transition-colors duration-150 bg-transparent text-ink border border-line-2 hover:bg-bg px-3 py-1.5 text-[13px]"
              >
                {item.action}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
