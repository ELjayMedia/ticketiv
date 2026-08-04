"use client"

// Quiet · Super-admin · Dispute queue

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import type { DisputesOverview, DisputeRow, DisputeStatus } from "@/lib/data/admin/disputes"
import { transitionDispute } from "@/app/super-admin/disputes/actions"

const OPEN_STATUSES: DisputeStatus[] = ["open", "investigating", "awaiting_customer"]

function money(cents: number | null, currency: string | null): string {
  if (cents == null) return "—"
  return `${currency ?? "SZL"} ${(cents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}`
}

function relative(iso: string | null): string {
  if (!iso) return "—"
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function statusClass(status: DisputeStatus): string {
  switch (status) {
    case "open":
      return "bg-[#fdf0ec] text-[#c1422b]"
    case "investigating":
    case "awaiting_customer":
      return "bg-[#fdf6ed] text-[#c1841c]"
    case "resolved":
      return "bg-accent-soft text-accent"
    default:
      return "bg-line text-ink-3"
  }
}

export function DisputesScreen({ overview }: { overview: DisputesOverview }) {
  const [busy, setBusy] = React.useState<string | null>(null)
  const [msg, setMsg] = React.useState<Record<string, string>>({})
  const [showClosed, setShowClosed] = React.useState(false)

  const act = async (
    d: DisputeRow,
    status: DisputeStatus,
    opts?: { assignToMe?: boolean; prompt?: boolean },
  ) => {
    let resolution: string | null = null
    if (opts?.prompt) {
      resolution = window.prompt(`Resolution note for this dispute (${status}):`) ?? null
      if (resolution === null) return
    }
    setBusy(d.id)
    try {
      const res = await transitionDispute({
        disputeId: d.id,
        status,
        resolution,
        assignToMe: opts?.assignToMe,
      })
      setMsg((p) => ({ ...p, [d.id]: res.message }))
    } catch (err) {
      setMsg((p) => ({ ...p, [d.id]: err instanceof Error ? err.message : "Failed" }))
    } finally {
      setBusy(null)
    }
  }

  const rows = overview.disputes.filter((d) =>
    showClosed ? true : OPEN_STATUSES.includes(d.status),
  )
  const { counts } = overview

  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            PLATFORM / DISPUTES
          </div>
          <h1 className="text-h1 mt-1">Dispute queue</h1>
        </div>
        <Button variant="outline" size="xs" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? "Show open only" : "Show all"}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-3.5">
        {[
          { label: "Open", value: counts.open },
          { label: "Investigating", value: counts.investigating },
          { label: "Unassigned", value: counts.unassigned_open },
          { label: "Stale > 7d", value: counts.stale_open },
        ].map((s) => (
          <Card key={s.label} className="px-4 py-3.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{s.label}</div>
            <div className="font-mono text-[22px] font-semibold tabular-nums">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <span className="text-h3">{showClosed ? "All disputes" : "Needs attention"}</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            {showClosed ? "No disputes recorded." : "Nothing outstanding — queue is clear."}
          </div>
        ) : (
          rows.map((d, i, arr) => (
            <div
              key={d.id}
              className={`flex items-start gap-3 px-4 py-3 ${
                i < arr.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${statusClass(
                      d.status,
                    )}`}
                  >
                    {d.status}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                    {d.kind.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {money(d.amount_cents, d.currency)}
                  </span>
                  {d.assigned_to == null && OPEN_STATUSES.includes(d.status) && (
                    <span className="font-mono text-[10px] text-[#c1841c]">unassigned</span>
                  )}
                </div>
                <span className="truncate text-xs text-ink-2">{d.reason ?? "No reason recorded"}</span>
                <span className="font-mono text-[10px] text-ink-3">
                  {d.org_name ?? "—"} · opened {relative(d.created_at)} ago
                  {d.order_id ? ` · order ${d.order_id.slice(0, 8)}` : ""}
                  {d.resolution ? ` · ${d.resolution}` : ""}
                </span>
                {msg[d.id] && (
                  <span className="font-mono text-[10px] text-ink-3">{msg[d.id]}</span>
                )}
              </div>

              {OPEN_STATUSES.includes(d.status) && (
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  {d.status === "open" && (
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={busy === d.id}
                      onClick={() => act(d, "investigating", { assignToMe: true })}
                    >
                      Take
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="primary"
                    disabled={busy === d.id}
                    onClick={() => act(d, "resolved", { prompt: true })}
                  >
                    {busy === d.id ? "…" : "Resolve"}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    disabled={busy === d.id}
                    onClick={() => act(d, "rejected", { prompt: true })}
                  >
                    <Icon name="close" size={12} />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </Card>

      <p className="font-mono text-[10px] leading-relaxed text-ink-3">
        Chargebacks open a dispute automatically when recorded, so the queue reflects money already
        clawed back. Resolving a dispute records the outcome — it does not itself move money; issue
        the refund from the payment first, then resolve here.
      </p>
    </div>
  )
}
