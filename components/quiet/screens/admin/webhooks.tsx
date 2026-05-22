"use client"

// Quiet · Super-admin · Webhooks (inbound + outbound)

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import type { WebhooksOverview } from "@/lib/data/admin/webhooks"
import {
  upsertWebhookEndpoint,
  deleteWebhookEndpoint,
  toggleWebhookEndpoint,
  scheduleWebhookDispatcher,
  triggerWebhookDispatch,
} from "@/app/super-admin/webhooks/actions"

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
  const [showNew, setShowNew] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)

  const toggle = async (id: string, active: boolean) => {
    setBusy(id)
    try { await toggleWebhookEndpoint(id, active) } finally { setBusy(null) }
  }
  const remove = async (id: string, url: string) => {
    if (!confirm(`Delete endpoint ${url}?`)) return
    setBusy(id)
    try { await deleteWebhookEndpoint(id) } finally { setBusy(null) }
  }

  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">PLATFORM / WEBHOOKS</div>
          <h1 className="text-h1 mt-1">Webhooks</h1>
        </div>
        <Button variant="accent" size="xs" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={12} /> Add endpoint
        </Button>
      </div>

      {showNew && <NewEndpointDialog onDismiss={() => setShowNew(false)} />}

      <DispatcherPanel />


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
                  <div className="flex items-center gap-1">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${statusClass(
                        e.last_status_code,
                      )}`}
                    >
                      {e.last_status_code ?? "—"}
                    </span>
                    <button
                      type="button"
                      disabled={busy === e.id}
                      onClick={() => toggle(e.id, !e.is_active)}
                      aria-label={e.is_active ? "Disable" : "Enable"}
                      title={e.is_active ? "Pause" : "Resume"}
                      className="rounded-md p-1 text-ink-3 hover:bg-bg disabled:opacity-50"
                    >
                      <Icon name={e.is_active ? "minus" : "check"} size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={busy === e.id}
                      onClick={() => remove(e.id, e.url)}
                      aria-label="Delete endpoint"
                      className="rounded-md p-1 text-ink-3 hover:bg-[#fdf0ec] hover:text-[#c1422b] disabled:opacity-50"
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>
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
      ) : null}
      {tab === "inbound" && (
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

const KNOWN_EVENTS = [
  "order.created",
  "order.paid",
  "order.refunded",
  "ticket.issued",
  "ticket.transferred",
  "ticket.scanned",
  "payout.paid",
  "event.published",
]

function NewEndpointDialog({ onDismiss }: { onDismiss: () => void }) {
  const [url, setUrl] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [secret, setSecret] = React.useState("")
  const [selectedEvents, setSelectedEvents] = React.useState<Set<string>>(new Set())
  const [enabled, setEnabled] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const toggleEvt = (e: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(e)) next.delete(e)
      else next.add(e)
      return next
    })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      await upsertWebhookEndpoint({
        url: url.trim(),
        description: description.trim() || null,
        events: [...selectedEvents],
        secret: secret.trim() || null,
        is_active: enabled,
        org_id: null,
      })
      onDismiss()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6" onClick={onDismiss}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-lg border border-line bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-label">NEW ENDPOINT</div>
            <div className="text-h2 mt-0.5">Outbound webhook</div>
          </div>
          <button type="button" onClick={onDismiss} className="text-ink-3 hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <WhField label="URL">
            <input
              autoFocus
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your.app/webhooks/ticketiv"
              className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </WhField>
          <WhField label="Description">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Production buyer webhook"
              className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </WhField>
          <WhField label="Signing secret (optional)">
            <input
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="whsec_…"
              className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            />
          </WhField>
          <WhField label="Subscribe to events">
            <div className="flex flex-wrap gap-1.5">
              {KNOWN_EVENTS.map((evt) => {
                const on = selectedEvents.has(evt)
                return (
                  <button
                    key={evt}
                    type="button"
                    onClick={() => toggleEvt(evt)}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                      on
                        ? "border-transparent bg-accent-soft text-accent"
                        : "border-line-2 bg-surface text-ink-3"
                    }`}
                  >
                    {evt}
                  </button>
                )
              })}
            </div>
          </WhField>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[#6b3fbd]"
            />
            Enable immediately
          </label>
        </div>
        {err && (
          <div className="mt-3 rounded-md bg-[#fdf0ec] px-3 py-2 font-mono text-xs text-[#c1422b]">{err}</div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="default" size="xs" onClick={onDismiss}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" size="xs" disabled={busy || !url}>
            {busy ? "Saving…" : "Create endpoint"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function WhField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-label mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function DispatcherPanel() {
  const [busy, setBusy] = React.useState<"schedule" | "trigger" | null>(null)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [ok, setOk] = React.useState<boolean | null>(null)

  const run = async (which: "schedule" | "trigger") => {
    setBusy(which)
    setMsg(null)
    setOk(null)
    try {
      const result = which === "schedule"
        ? await scheduleWebhookDispatcher()
        : await triggerWebhookDispatch()
      setMsg(result.message)
      setOk(result.ok)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed")
      setOk(false)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-h3">Outbound dispatch worker</span>
          <span className="font-mono text-[11px] text-ink-3">
            Edge function <code className="rounded bg-[#f3f1ee] px-1">webhook-dispatch</code> sweeps pending deliveries with HMAC-SHA256 signature
          </span>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span
              className={`font-mono text-[10px] font-semibold ${
                ok ? "text-accent" : "text-[#c1422b]"
              }`}
            >
              {msg}
            </span>
          )}
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("trigger")}
            className="rounded-md border border-line-2 bg-surface px-3 py-1.5 font-mono text-[10px] font-semibold hover:bg-bg disabled:opacity-50"
          >
            {busy === "trigger" ? "Dispatching…" : "Dispatch now"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("schedule")}
            className="rounded-md border border-accent bg-accent-soft px-3 py-1.5 font-mono text-[10px] font-semibold text-accent hover:opacity-90 disabled:opacity-50"
          >
            {busy === "schedule" ? "Scheduling…" : "Schedule (every minute)"}
          </button>
        </div>
      </div>
    </Card>
  )
}
