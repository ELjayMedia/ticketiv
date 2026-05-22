"use client"

// Quiet · Super-admin · Webhooks (inbound + outbound)

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import type { WebhooksOverview } from "@/lib/data/admin/webhooks"

type Tab = "outbound" | "inbound"

function statusClass(code: number | null): string {
  if (code === null) return "bg-line text-ink-3"
  if (code >= 200 && code < 300) return "bg-accent-soft text-accent"
  if (code >= 400 && code < 500) return "bg-[#fdf6ed] text-[#c1841c]"
  if (code >= 500) return "bg-[#fdf0ec] text-[#c1422b]"
  return "bg-line text-ink-3"
}

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

export function WebhooksScreen({ overview }: { overview: WebhooksOverview }) {
  const [tab, setTab] = React.useState<Tab>("outbound")

  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">PLATFORM / WEBHOOKS</div>
          <h1 className="text-h1 mt-1">Webhooks</h1>
        </div>
        <Button variant="accent" size="xs">
          <Icon name="plus" size={12} /> Add endpoint
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-1 w-fit">
        {(["outbound", "inbound"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              tab === t ? "bg-ink text-white" : "text-ink-3"
            }`}
          >
            {t === "outbound"
              ? `Outbound · ${overview.outbound.length}`
              : `Inbound · ${overview.inbound.length}`}
          </button>
        ))}
      </div>

      {tab === "outbound" ? (
        <div className="grid grid-cols-[1fr_1.4fr] gap-3.5">
          {/* Endpoints */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3.5">
              <span className="text-h3">Endpoints</span>
            </div>
            {overview.outbound.length === 0 ? (
              <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
                No outbound endpoints configured.
              </div>
            ) : (
              overview.outbound.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    i < overview.outbound.length - 1 ? "border-b border-line" : ""
                  }`}
                >
                  <div
                    className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                      e.is_active ? "bg-accent" : "bg-line-2"
                    }`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-mono text-xs font-semibold">{e.url}</span>
                    <span className="font-mono text-[10px] text-ink-3">
                      {e.org_name ?? "Platform-level"} · {e.events.length} event{e.events.length === 1 ? "" : "s"}
                    </span>
                    {e.events.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {e.events.slice(0, 4).map((evt) => (
                          <span key={evt} className="rounded bg-[#f3f1ee] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-3">
                            {evt}
                          </span>
                        ))}
                        {e.events.length > 4 && (
                          <span className="font-mono text-[9px] text-ink-3">+{e.events.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${statusClass(
                      e.last_status_code,
                    )}`}
                  >
                    {e.last_status_code ?? "—"}
                  </span>
                </div>
              ))
            )}
          </Card>

          {/* Live delivery tail */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
              <span className="text-h3">Live delivery tail</span>
              <span className="font-mono text-[11px] text-ink-3">last {overview.tail.length}</span>
            </div>
            {overview.tail.length === 0 ? (
              <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
                No deliveries yet.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {overview.tail.map((d, i, arr) => (
                  <div
                    key={d.id}
                    className={`grid grid-cols-[0.5fr_2fr_1fr_0.5fr_0.6fr] items-center gap-2 px-4 py-2 ${
                      i < arr.length - 1 ? "border-b border-line" : ""
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${statusClass(
                        d.response_status,
                      )}`}
                    >
                      {d.response_status ?? "—"}
                    </span>
                    <span className="truncate font-mono text-[11px] text-ink-3">{d.endpoint_url}</span>
                    <span className="font-mono text-[11px]">{d.event_type}</span>
                    <span className="font-mono text-[10px] text-ink-3">
                      {d.duration_ms ? `${d.duration_ms}ms` : "—"}
                    </span>
                    <span className="text-right font-mono text-[10px] text-ink-3">{relative(d.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="border-b border-line px-4 py-3.5">
            <span className="text-h3">Inbound (provider callbacks)</span>
          </div>
          <div className="grid grid-cols-[0.8fr_1fr_2fr_1fr_0.8fr] gap-2 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
            <span>Provider</span><span>Event ID</span><span>Signature</span><span>Received</span><span>Processed</span>
          </div>
          {overview.inbound.length === 0 ? (
            <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
              No inbound webhooks received yet.
            </div>
          ) : (
            overview.inbound.map((w, i, arr) => (
              <div
                key={w.id}
                className={`grid grid-cols-[0.8fr_1fr_2fr_1fr_0.8fr] items-center gap-2 px-4 py-2.5 text-xs ${
                  i < arr.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span className="font-mono font-semibold">{w.provider}</span>
                <span className="font-mono text-ink-3">{w.provider_event_id ?? "—"}</span>
                <span className="truncate font-mono text-[10px] text-ink-3">
                  {w.signature ? `${w.signature.slice(0, 24)}…` : "—"}
                </span>
                <span className="font-mono text-[11px] text-ink-3">{relative(w.received_at)}</span>
                <span
                  className={`inline-flex w-fit items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    w.processed_at ? "bg-accent-soft text-accent" : "bg-[#fdf6ed] text-[#c1841c]"
                  }`}
                >
                  {w.processed_at ? "DONE" : "PENDING"}
                </span>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  )
}
