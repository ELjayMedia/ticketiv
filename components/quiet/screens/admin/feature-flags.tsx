"use client"

// Quiet · Super-admin · Feature flags
// Pixel-faithful port of QuietDeskSuperFlags. Client-side because the row
// toggles + add/delete need to call server actions in /super-admin/flags.

import * as React from "react"
import { Card } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import type { PlatformFlag } from "@/lib/data/admin/feature-flags"
import {
  upsertPlatformFlag,
  deletePlatformFlag,
  togglePlatformFlag,
} from "@/app/super-admin/flags/actions"

export interface FeatureFlagsScreenProps {
  flags: PlatformFlag[]
}

const STATE_META: Record<string, { fg: string; bg: string; label: string }> = {
  live: { fg: "text-accent", bg: "bg-accent-soft", label: "LIVE" },
  rollout: { fg: "text-[#c1841c]", bg: "bg-[#fdf6ed]", label: "ROLLOUT" },
  off: { fg: "text-ink-3", bg: "bg-[#f3f1ee]", label: "OFF" },
}

function stateFor(f: PlatformFlag): keyof typeof STATE_META {
  if (!f.enabled) return "off"
  if (f.rollout_percent !== null && f.rollout_percent < 100) return "rollout"
  return "live"
}

const RELATIVE = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" })
function timeAgo(iso: string | null): string {
  if (!iso) return "never"
  const ms = Date.now() - new Date(iso).getTime()
  const d = Math.floor(ms / 86_400_000)
  if (d < 1) return "today"
  if (d < 30) return RELATIVE.format(-d, "day")
  return RELATIVE.format(-Math.floor(d / 30), "month")
}

export function FeatureFlagsScreen({ flags }: FeatureFlagsScreenProps) {
  const inRollout = flags.filter((f) => stateFor(f) === "rollout").length
  const live = flags.filter((f) => stateFor(f) === "live").length
  const off = flags.filter((f) => stateFor(f) === "off").length
  const [showNew, setShowNew] = React.useState(false)
  const [busy, setBusy] = React.useState<string | null>(null)

  const toggle = async (f: PlatformFlag) => {
    setBusy(f.id)
    try {
      await togglePlatformFlag(f.id, !f.enabled)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (f: PlatformFlag) => {
    if (!confirm(`Delete flag ${f.key}?`)) return
    setBusy(f.id)
    try {
      await deletePlatformFlag(f.id)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-3.5 p-7">
      {/* Header */}
      <div className="flex items-end justify-between pb-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-ink-3">PLATFORM / FLAGS</div>
          <h1 className="text-h1 mt-1">{flags.length} flags</h1>
        </div>
        <Button variant="accent" size="xs" onClick={() => setShowNew(true)}>
          <Icon name="plus" size={12} /> New flag
        </Button>
      </div>

      {showNew && <NewFlagDialog onDismiss={() => setShowNew(false)} />}

      {/* Rollout banner */}
      {inRollout > 0 && (
        <Card className="border-[#fde2c1] bg-[#fdf6ed] p-5">
          <div className="text-h3 mb-1">{inRollout} flag{inRollout === 1 ? "" : "s"} in rollout</div>
          <div className="text-sm text-ink-2">
            Partial rollouts are evaluated per-request. Move to 100% when validated, or pause to halt.
          </div>
        </Card>
      )}

      {/* KPI strip */}
      <div className="flex gap-3.5">
        <KPI label="Live" value={String(live)} />
        <KPI label="Rollout" value={String(inRollout)} />
        <KPI label="Off / paused" value={String(off)} />
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1.7fr_0.7fr_1.2fr_1.6fr_1.2fr_0.9fr_0.8fr] gap-2.5 border-b border-line bg-bg px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">
          <span>Flag</span>
          <span>State</span>
          <span>Rollout</span>
          <span>Description / tags</span>
          <span>Org overrides</span>
          <span>Owner</span>
          <span>Changed</span>
        </div>
        {flags.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-ink-3">
            No platform flags. Create one to roll out a feature across all orgs.
          </div>
        ) : (
          flags.map((f, i) => {
            const state = stateFor(f)
            const meta = STATE_META[state]
            return (
              <div
                key={f.id}
                className={`grid grid-cols-[1.7fr_0.7fr_1.2fr_1.6fr_1.2fr_0.9fr_0.8fr] items-center gap-2.5 px-4 py-3.5 ${
                  i < flags.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs font-semibold text-ink">{f.key}</span>
                  {f.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {f.tags.map((t) => (
                        <span key={t} className="rounded bg-[#f3f1ee] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-ink-3">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className={`inline-flex w-fit items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${meta.bg} ${meta.fg}`}>
                  {meta.label}
                </span>
                <div className="flex flex-col gap-1">
                  <div className="h-1.5 rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${f.rollout_percent ?? (f.enabled ? 100 : 0)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-ink-3">
                    {f.rollout_percent === null ? (f.enabled ? "100%" : "0%") : `${f.rollout_percent}%`}
                  </span>
                </div>
                <span className="text-[11px] leading-snug text-ink-3">
                  {f.description ?? <span className="italic">no description</span>}
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  {f.per_org_overrides === 0 ? "none" : `${f.per_org_overrides} override${f.per_org_overrides === 1 ? "" : "s"}`}
                </span>
                <span className="font-mono text-[11px] text-ink-3">
                  {f.owner_email ?? "—"}
                </span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-ink-3">{timeAgo(f.last_changed_at)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy === f.id}
                      onClick={() => toggle(f)}
                      className="rounded-md border border-line-2 bg-surface px-2 py-1 font-mono text-[10px] font-semibold hover:bg-bg disabled:opacity-50"
                      title={f.enabled ? "Pause" : "Resume"}
                    >
                      {f.enabled ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      disabled={busy === f.id}
                      onClick={() => remove(f)}
                      aria-label={`Delete ${f.key}`}
                      className="rounded-md p-1 text-ink-3 hover:bg-[#fdf0ec] hover:text-[#c1422b] disabled:opacity-50"
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}

function NewFlagDialog({ onDismiss }: { onDismiss: () => void }) {
  const [key, setKey] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [rollout, setRollout] = React.useState<string>("")
  const [tags, setTags] = React.useState<string>("")
  const [enabled, setEnabled] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      await upsertPlatformFlag({
        key: key.trim(),
        enabled,
        rollout_percent: rollout.trim() === "" ? null : Number(rollout),
        description: description.trim() || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
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
            <div className="text-label">NEW FLAG</div>
            <div className="text-h2 mt-0.5">Platform feature flag</div>
          </div>
          <button type="button" onClick={onDismiss} className="text-ink-3 hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <Field label="Key (snake_case)">
            <input
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="resale_marketplace"
              className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              required
            />
          </Field>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Allow attendees to resell tickets at face value + 6% fee."
              className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rollout %">
              <input
                type="number"
                min={0}
                max={100}
                value={rollout}
                onChange={(e) => setRollout(e.target.value)}
                placeholder="100"
                className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent"
              />
            </Field>
            <Field label="Tags (comma-sep)">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="growth, resale"
                className="w-full rounded-md border border-line-2 bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </Field>
          </div>
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
          <Button type="submit" variant="accent" size="xs" disabled={busy}>
            {busy ? "Saving…" : "Create flag"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-label mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex-1 p-4">
      <div className="text-label">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tracking-tight">{value}</div>
    </Card>
  )
}
