// Quiet · Super-admin · Jobs queue (flat-by-kind, no schema changes).
// Replaces the design's worker grid with a per-kind summary derived from
// the jobs table.

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import type { JobsOverview, JobRow } from "@/lib/data/admin/jobs"

function relative(iso: string | null): string {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function jobState(j: JobRow): "pending" | "in_flight" | "failed" | "done" {
  if (j.attempts >= j.max_attempts && Boolean(j.last_error)) return "failed"
  if (j.locked_at) return "in_flight"
  if (j.run_after === null || j.run_after <= new Date().toISOString()) return "pending"
  return "done"
}

function stateClass(state: ReturnType<typeof jobState>): string {
  switch (state) {
    case "pending":
      return "bg-[#fdf6ed] text-[#c1841c]"
    case "in_flight":
      return "bg-accent-soft text-accent"
    case "failed":
      return "bg-[#fdf0ec] text-[#c1422b]"
    default:
      return "bg-line text-ink-3"
  }
}

export function JobsScreen({ overview }: { overview: JobsOverview }) {
  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">PLATFORM / JOBS</div>
          <h1 className="text-h1 mt-1">Jobs queue</h1>
          <div className="font-mono text-[11px] text-ink-3">
            grouped by kind · derived from <code className="rounded bg-[#f3f1ee] px-1">public.jobs</code>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex gap-3.5">
        <KPI label="Total (last 500)" value={String(overview.totals.total)} />
        <KPI label="Pending" value={String(overview.totals.pending)} accent={overview.totals.pending > 0 ? "warn" : null} />
        <KPI label="In flight" value={String(overview.totals.in_flight)} accent={overview.totals.in_flight > 0 ? "ok" : null} />
        <KPI label="Failed" value={String(overview.totals.failed)} accent={overview.totals.failed > 0 ? "danger" : null} />
      </div>

      {/* By kind */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <span className="text-h3">By kind</span>
        </div>
        <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] gap-2 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Kind</span><span>Total</span><span>Pending</span><span>In flight</span><span>Failed</span><span>Oldest pending</span>
        </div>
        {overview.byKind.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            No jobs in queue.
          </div>
        ) : (
          overview.byKind.map((k, i, arr) => (
            <div
              key={k.kind}
              className={`grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_0.8fr_1fr] items-center gap-2 px-4 py-3 text-xs ${
                i < arr.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className="font-mono font-semibold">{k.kind}</span>
              <span className="font-mono">{k.total}</span>
              <span className="font-mono text-[#c1841c]">{k.pending}</span>
              <span className="font-mono text-accent">{k.in_flight}</span>
              <span className="font-mono text-[#c1422b]">{k.failed}</span>
              <span className="font-mono text-[11px] text-ink-3">
                {k.oldest_pending_iso ? relative(k.oldest_pending_iso) + " ago" : "—"}
              </span>
            </div>
          ))
        )}
      </Card>

      {/* Recent tail */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <span className="text-h3">Recent</span>
          <span className="font-mono text-[11px] text-ink-3">last {overview.recent.length}</span>
        </div>
        <div className="grid grid-cols-[2fr_0.6fr_0.8fr_0.8fr_2fr_1fr] gap-2 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Kind</span><span>State</span><span>Attempts</span><span>Run after</span><span>Last error</span><span>Created</span>
        </div>
        {overview.recent.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            No recent jobs.
          </div>
        ) : (
          overview.recent.map((j, i, arr) => {
            const s = jobState(j)
            return (
              <div
                key={j.id}
                className={`grid grid-cols-[2fr_0.6fr_0.8fr_0.8fr_2fr_1fr] items-center gap-2 px-4 py-2.5 text-xs ${
                  i < arr.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="truncate font-mono">{j.kind}</span>
                <span
                  className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${stateClass(s)}`}
                >
                  {s}
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  {j.attempts}/{j.max_attempts}
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  {j.run_after ? relative(j.run_after) : "—"}
                </span>
                <span className="truncate font-mono text-[10px] text-ink-3">
                  {j.last_error ?? "—"}
                </span>
                <span className="font-mono text-[11px] text-ink-3">{relative(j.created_at)}</span>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "ok" | "warn" | "danger" | null
}) {
  const tone =
    accent === "ok"
      ? "text-accent"
      : accent === "warn"
        ? "text-[#c1841c]"
        : accent === "danger"
          ? "text-[#c1422b]"
          : ""
  return (
    <Card className="flex-1 p-4">
      <div className="text-label">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold tracking-tight ${tone}`}>{value}</div>
    </Card>
  )
}
