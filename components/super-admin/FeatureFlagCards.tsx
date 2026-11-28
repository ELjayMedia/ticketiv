"use client"

import { useActionState, useId, useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import type { FlagCardData, FlagExclusionView, FlagTargetOptions } from "@/lib/data/admin/feature-flags"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

export interface FlagInfo {
  label: string
  /** Where the app checks it. null = nothing in the app reads this flag yet. */
  appliesTo: string | null
}

function Result({ state }: { state: ConsoleActionResult }) {
  if (state.status === "idle") return null
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn("rounded-md px-3 py-2 text-[13px]", state.status === "done" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}
    >
      {state.message}
    </p>
  )
}

function FlagSwitch({ flagKey, label, on, action, disabled }: { flagKey: string; label: string; on: boolean; action: ServerAction; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const shown = pending ? !on : on
  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="key" value={flagKey} />
        <input type="hidden" name="enabled" value={on ? "false" : "true"} />
        <button
          type="submit"
          role="switch"
          aria-checked={shown}
          aria-label={`${label}: ${on ? "on, switch off" : "off, switch on"}`}
          disabled={disabled || pending}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft disabled:opacity-50",
            shown ? "border-success bg-success" : "border-line-2 bg-surface-2",
          )}
        >
          <span className={cn("inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform", shown ? "translate-x-6" : "translate-x-1")} />
        </button>
      </form>
      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-3">{shown ? "On" : "Off"}</span>
      {state.status === "error" ? (
        <div className="max-w-xs">
          <Result state={state} />
        </div>
      ) : null}
    </div>
  )
}

function RemoveExclusion({ exclusion, action, disabled }: { exclusion: FlagExclusionView; action: ServerAction; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="id" value={exclusion.id} />
      <Button type="submit" variant="ghost" size="xs" disabled={disabled || pending} aria-label={`Stop excluding ${exclusion.label}`}>
        {pending ? "Removing…" : "Remove"}
      </Button>
      {state.status === "error" ? <Result state={state} /> : null}
    </form>
  )
}

function dateLabel(iso: string | null) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function AddExclusion({ flagKey, targets, action }: { flagKey: string; targets: FlagTargetOptions; action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const uid = useId()
  const [orgId, setOrgId] = useState("")
  const events = useMemo(() => targets.events.filter((e) => e.orgId === orgId), [targets.events, orgId])
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-md border border-line bg-bg p-3">
      <input type="hidden" name="key" value={flagKey} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${uid}-org`}>Organisation</Label>
          <select
            id={`${uid}-org`}
            name="orgId"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            required
            className="h-9 rounded-md border border-line-2 bg-surface px-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Choose an organisation…</option>
            {targets.organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${uid}-event`}>Event</Label>
          <select
            id={`${uid}-event`}
            name="eventId"
            disabled={!orgId}
            defaultValue=""
            key={orgId}
            className="h-9 rounded-md border border-line-2 bg-surface px-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
          >
            <option value="">All its events (the whole organisation)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
                {e.startsAt ? ` · ${dateLabel(e.startsAt)}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${uid}-reason`}>
          Reason <span className="font-normal text-ink-3">(optional, goes in the audit log)</span>
        </Label>
        <Input id={`${uid}-reason`} name="reason" maxLength={500} placeholder="e.g. Organiser asked for no resale at this event" />
      </div>
      <Result state={state} />
      <div>
        <Button type="submit" variant="accent" size="sm" disabled={pending || !orgId}>
          {pending ? "Excluding…" : "Exclude"}
        </Button>
      </div>
    </form>
  )
}

export function FeatureFlagCard({
  flag,
  info,
  targets,
  canAct,
  setAction,
  addAction,
  removeAction,
}: {
  flag: FlagCardData
  info: FlagInfo
  targets: FlagTargetOptions
  canAct: boolean
  setAction: ServerAction
  addAction: ServerAction
  removeAction: ServerAction
}) {
  const [adding, setAdding] = useState(false)
  const count = flag.exclusions.length
  let badge: ReactNode
  if (!flag.enabled) badge = <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-3">Off for everyone</span>
  else if (count) badge = <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">On, {count} excluded</span>
  else badge = <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">On for everyone</span>

  return (
    <section id={`flag-${flag.key}`} className="scroll-mt-6 rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{info.label}</h2>
            {badge}
          </div>
          {flag.description ? <p className="text-[13px] text-ink-2">{flag.description}</p> : null}
          <p className="text-[12px] text-ink-3">
            {info.appliesTo ? `Controls ${info.appliesTo}.` : "Nothing in the app checks this flag yet, so switching it changes nothing for now."}
            <span className="font-mono text-[11px] text-ink-4"> {flag.key}</span>
          </p>
        </div>
        <FlagSwitch flagKey={flag.key} label={info.label} on={flag.enabled} action={setAction} disabled={!canAct} />
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-ink-2">Excluded</h3>
          {canAct && !adding ? (
            <Button type="button" variant="outline" size="xs" onClick={() => setAdding(true)}>
              Exclude an organisation or event
            </Button>
          ) : null}
        </div>
        {count === 0 ? (
          <p className="text-[13px] text-ink-3">No exclusions. {flag.enabled ? "Every organisation and event gets this feature." : ""}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {flag.exclusions.map((ex) => (
              <li key={ex.id} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-[13px] font-medium text-ink">
                    <span className="mr-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">{ex.kind === "organisation" ? "Org" : "Event"}</span>
                    {ex.label}
                  </span>
                  <span className="text-[12px] text-ink-3">
                    {[ex.detail, ex.reason, `since ${dateLabel(ex.createdAt)}`].filter(Boolean).join(" · ")}
                  </span>
                </div>
                {canAct ? <RemoveExclusion exclusion={ex} action={removeAction} disabled={!canAct} /> : null}
              </li>
            ))}
          </ul>
        )}
        {!flag.enabled && count > 0 ? (
          <p className="text-[12px] text-ink-4">The feature is off for everyone, so these only matter once it&apos;s switched back on.</p>
        ) : null}
        {adding ? (
          <div className="flex flex-col gap-2">
            <AddExclusion flagKey={flag.key} targets={targets} action={addAction} />
            <div>
              <Button type="button" variant="ghost" size="xs" onClick={() => setAdding(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
