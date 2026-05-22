// Quiet · Super-admin · Providers + routing

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import type { RoutingOverview } from "@/lib/data/admin/routing"

export function RoutingScreen({ overview }: { overview: RoutingOverview }) {
  const successRate24h =
    overview.totalAttempts24h > 0
      ? Math.round((overview.successful24h / overview.totalAttempts24h) * 1000) / 10
      : null

  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">PLATFORM / PROVIDERS</div>
          <h1 className="text-h1 mt-1">Providers &amp; routing</h1>
        </div>
        <Button variant="accent" size="xs">
          <Icon name="plus" size={12} /> Add provider
        </Button>
      </div>

      {/* KPIs */}
      <div className="flex gap-3.5">
        <KPI label="Providers" value={String(overview.providers.length)} sub={`${overview.providers.filter((p) => p.is_enabled).length} enabled`} />
        <KPI
          label="Success 24h"
          value={successRate24h === null ? "—" : `${successRate24h}%`}
          sub={`${overview.successful24h} / ${overview.totalAttempts24h} attempts`}
        />
        <KPI label="Routing rules" value={String(overview.rules.length)} sub={`${overview.rules.filter((r) => r.is_active).length} active`} />
        <KPI label="Latency p95" value="—" sub="next phase" />
      </div>

      {/* Routing rules */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <div>
            <span className="text-h3">Routing rules · live</span>
            <div className="font-mono text-[11px] text-ink-3">evaluated by priority ascending; first match wins</div>
          </div>
          <Button variant="default" size="xs">
            <Icon name="plus" size={12} /> Add rule
          </Button>
        </div>
        <div className="grid grid-cols-[0.5fr_0.8fr_0.8fr_1fr_1fr_0.6fr_1fr_24px] gap-2 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>#</span><span>Country</span><span>Currency</span><span>Provider</span><span>Fallback</span><span>Active</span><span>Notes</span><span />
        </div>
        {overview.rules.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            No routing rules. Add one to route specific country/currency combos to specific providers.
          </div>
        ) : (
          overview.rules.map((r, i, arr) => (
            <div
              key={r.id}
              className={`grid grid-cols-[0.5fr_0.8fr_0.8fr_1fr_1fr_0.6fr_1fr_24px] items-center gap-2 px-4 py-2.5 text-xs ${
                i < arr.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <span className="font-mono font-semibold">{r.priority}</span>
              <span className="font-mono text-ink-3">{r.country_code ?? "any"}</span>
              <span className="font-mono text-ink-3">{r.currency ?? "any"}</span>
              <span className="font-mono font-semibold">{r.provider}</span>
              <span className="font-mono text-ink-3">{r.fallback_provider ?? "—"}</span>
              <span
                className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                  r.is_active ? "bg-accent-soft text-accent" : "bg-[#f3f1ee] text-ink-3"
                }`}
              >
                {r.is_active ? "on" : "off"}
              </span>
              <span className="truncate font-mono text-[10px] text-ink-3">{r.notes ?? "—"}</span>
              <Icon name="chevR" size={14} className="text-ink-3" />
            </div>
          ))
        )}
      </Card>

      {/* Provider catalog with sparklines */}
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3.5">
          <span className="text-h3">Provider catalog · success rate 24h</span>
        </div>
        <div className="grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_24px] gap-2 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Provider</span><span>Mode</span><span>Callback URL</span><span>Attempts</span><span>Success</span><span />
        </div>
        {overview.providers.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            No providers configured.
          </div>
        ) : (
          overview.providers.map((p, i, arr) => (
            <div
              key={p.provider}
              className={`grid grid-cols-[1.4fr_0.8fr_1fr_0.8fr_0.8fr_24px] items-center gap-2 px-4 py-3 text-xs ${
                i < arr.length - 1 ? "border-b border-line" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-accent-soft font-mono text-[10px] font-semibold text-accent">
                  {p.provider[0].toUpperCase()}
                </span>
                <span className="font-semibold">{p.provider}</span>
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase ${
                    p.is_enabled ? "bg-accent-soft text-accent" : "bg-[#f3f1ee] text-ink-3"
                  }`}
                >
                  {p.is_enabled ? "on" : "off"}
                </span>
              </div>
              <span className="font-mono text-ink-3">{p.mode ?? "—"}</span>
              <span className="truncate font-mono text-[11px] text-ink-3">{p.callback_url ?? "—"}</span>
              <span className="font-mono">{p.attempts_24h}</span>
              <span
                className={`font-mono font-semibold ${
                  p.success_rate_24h === null
                    ? "text-ink-3"
                    : p.success_rate_24h >= 97
                      ? "text-accent"
                      : p.success_rate_24h >= 90
                        ? "text-[#c1841c]"
                        : "text-[#c1422b]"
                }`}
              >
                {p.success_rate_24h === null ? "—" : `${p.success_rate_24h}%`}
              </span>
              <Icon name="chevR" size={14} className="text-ink-3" />
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="flex-1 p-4">
      <div className="text-label">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 font-mono text-[10px] text-ink-3">{sub}</div>}
    </Card>
  )
}
