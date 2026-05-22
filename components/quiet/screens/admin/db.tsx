// Quiet · Super-admin · DB / Supabase
// Slow queries + table stats from direct SQL; project health from
// Management API when SUPABASE_ACCESS_TOKEN is configured; otherwise
// a deep-link to the Supabase project dashboard.

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import type { DBOverview } from "@/lib/data/admin/db"

function bytes(n: number): string {
  if (!n) return "—"
  const units = ["B", "KB", "MB", "GB"]
  let v = n
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}

export function DBScreen({ overview }: { overview: DBOverview }) {
  const { health, slowQueries, tables } = overview
  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">PLATFORM / DB</div>
          <h1 className="text-h1 mt-1">DB · Supabase</h1>
          <div className="font-mono text-[11px] text-ink-3">
            slow queries from <code className="rounded bg-[#f3f1ee] px-1">pg_stat_statements</code> · table stats from <code className="rounded bg-[#f3f1ee] px-1">pg_stat_user_tables</code>
          </div>
        </div>
        {health.dashboard_url && (
          <a
            href={health.dashboard_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-line-2 bg-surface px-3 py-1.5 text-xs font-semibold hover:bg-bg"
          >
            <Icon name="arrowUR" size={12} /> Open in Supabase
          </a>
        )}
      </div>

      {/* Project health */}
      <div className="flex gap-3.5">
        <KPI label="Status" value={health.status ?? "unknown"} tone={health.status === "ACTIVE_HEALTHY" ? "ok" : null} />
        <KPI label="Region" value={health.region ?? "—"} />
        <KPI label="Postgres" value={health.postgres_version ?? "—"} sub={health.release_channel ?? undefined} />
        <KPI
          label="Source"
          value={health.fetched_from_management_api ? "Mgmt API" : "Dashboard link"}
          sub={
            health.fetched_from_management_api
              ? "live"
              : "set SUPABASE_ACCESS_TOKEN to embed metrics"
          }
        />
      </div>

      {/* Slow queries */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <span className="text-h3">Slow queries</span>
          <div className="font-mono text-[11px] text-ink-3">top 10 by mean execution time</div>
        </div>
        <div className="grid grid-cols-[3fr_0.6fr_0.8fr_0.8fr_0.6fr] gap-2 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Query</span><span>Calls</span><span>Mean ms</span><span>Total ms</span><span>Rows</span>
        </div>
        {slowQueries.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            No data. Slow query telemetry requires an <code className="rounded bg-[#f3f1ee] px-1">exec_sql</code> RPC; view in Supabase Studio for now.
          </div>
        ) : (
          slowQueries.map((q, i, arr) => (
            <div
              key={i}
              className={`grid grid-cols-[3fr_0.6fr_0.8fr_0.8fr_0.6fr] items-start gap-2 px-4 py-2.5 text-xs ${
                i < arr.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <code className="block max-w-full truncate font-mono text-[11px] text-ink-2">
                {q.query.length > 200 ? q.query.slice(0, 200) + "…" : q.query}
              </code>
              <span className="font-mono">{q.calls}</span>
              <span className="font-mono font-semibold">{Math.round(q.mean_exec_ms)}</span>
              <span className="font-mono text-ink-3">{Math.round(q.total_exec_ms)}</span>
              <span className="font-mono text-ink-3">{q.rows}</span>
            </div>
          ))
        )}
      </Card>

      {/* Tables */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <span className="text-h3">Public-schema tables · live rows + bloat</span>
        </div>
        <div className="grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_1fr_1fr] gap-2 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Table</span><span>Live rows</span><span>Dead</span><span>Bloat</span><span>Last vacuum</span><span>Last autovacuum</span>
        </div>
        {tables.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            No data. (pg_stat_user_tables may not be exposed via PostgREST in this project.)
          </div>
        ) : (
          tables.map((t, i, arr) => (
            <div
              key={t.table}
              className={`grid grid-cols-[2fr_0.8fr_0.8fr_0.8fr_1fr_1fr] items-center gap-2 px-4 py-2.5 text-xs ${
                i < arr.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className="font-mono font-semibold">{t.table}</span>
              <span className="font-mono">{t.live_rows.toLocaleString()}</span>
              <span className="font-mono text-ink-3">{t.dead_rows.toLocaleString()}</span>
              <span
                className={`font-mono ${
                  t.bloat_pct === null
                    ? "text-ink-3"
                    : t.bloat_pct < 10
                      ? "text-accent"
                      : t.bloat_pct < 30
                        ? "text-[#c1841c]"
                        : "text-[#c1422b]"
                }`}
              >
                {t.bloat_pct === null ? "—" : `${t.bloat_pct}%`}
              </span>
              <span className="font-mono text-[11px] text-ink-3">
                {t.last_vacuum_iso ? new Date(t.last_vacuum_iso).toLocaleDateString("en-GB") : "—"}
              </span>
              <span className="font-mono text-[11px] text-ink-3">
                {t.last_autovacuum_iso ? new Date(t.last_autovacuum_iso).toLocaleDateString("en-GB") : "—"}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

function KPI({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub?: string
  tone?: "ok" | null
}) {
  return (
    <Card className="flex-1 p-4">
      <div className="text-label">{label}</div>
      <div className={`mt-1 font-mono text-lg font-semibold tracking-tight ${tone === "ok" ? "text-accent" : ""}`}>
        {value}
      </div>
      {sub && <div className="mt-1 font-mono text-[10px] text-ink-3">{sub}</div>}
    </Card>
  )
}
