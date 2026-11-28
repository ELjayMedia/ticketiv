"use client"

import { useActionState, useId, useState, type ReactNode } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>
type Tone = "danger" | "warning" | "success" | "accent" | "muted"

export interface IntegrationCardField {
  name: string
  label: string
  hint: string | null
  secret: boolean
  required: boolean
  /** Deployment safety flag: shown, only settable in Coolify. */
  envOnly: boolean
  /** Saved non-secret value (never a secret). */
  savedValue: string | null
  /** Last 4 characters of a saved secret. */
  savedHint: string | null
  savedHere: boolean
  /** The Coolify environment has a value (the value itself is never sent). */
  inEnv: boolean
}

export interface IntegrationCardModel {
  id: string
  label: string
  purpose: string
  badge: string
  tone: Tone
  summary: string
  switchedOn: boolean
  /** "full": fields editable here; "switch": keys stay in Coolify. */
  mode: "full" | "switch"
  fields: IntegrationCardField[]
  missing: string[]
  readiness?: { badge: string; tone: Tone; detail: string } | null
  oneAtATime: boolean
}

const PILL: Record<Tone, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent",
  muted: "bg-surface-2 text-ink-3",
}

function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", PILL[tone])}>{children}</span>
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

/** The on/off switch. A form so it works without JavaScript and goes through the audited action. */
function SwitchForm({ id, label, on, action, disabled }: { id: string; label: string; on: boolean; action: ServerAction; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const shown = pending ? !on : on
  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="provider" value={id} />
        <input type="hidden" name="on" value={on ? "false" : "true"} />
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
      {state.status !== "idle" ? (
        <div className="max-w-xs">
          <Result state={state} />
        </div>
      ) : null}
    </div>
  )
}

function SourceNote({ f }: { f: IntegrationCardField }) {
  if (f.envOnly) {
    return <span className={cn("font-mono text-[11px]", f.inEnv ? "text-ink-3" : "text-ink-4")}>{f.inEnv ? "Set in Coolify" : "Not set (Coolify only)"}</span>
  }
  if (f.savedHere) return <span className="font-mono text-[11px] text-success">Saved here{f.savedHint ? ` · ends in ${f.savedHint}` : ""}</span>
  if (f.inEnv) return <span className="font-mono text-[11px] text-ink-3">Using Coolify value</span>
  return <span className={cn("font-mono text-[11px]", f.required ? "text-warning" : "text-ink-4")}>{f.required ? "Not set" : "Optional"}</span>
}

function SettingsForm({ model, action }: { model: IntegrationCardModel; action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const uid = useId()
  const editable = model.fields.filter((f) => !f.envOnly)
  const flags = model.fields.filter((f) => f.envOnly)
  return (
    <form action={formAction} className="flex flex-col gap-4" autoComplete="off">
      <input type="hidden" name="provider" value={model.id} />
      {editable.map((f) => {
        const inputId = `${uid}-${f.name}`
        return (
          <div key={f.name} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label htmlFor={inputId}>
                {f.label}
                {f.required ? null : <span className="font-normal text-ink-3"> (optional)</span>}
              </Label>
              <SourceNote f={f} />
            </div>
            <Input
              id={inputId}
              name={f.name}
              type={f.secret ? "password" : "text"}
              defaultValue={f.secret ? undefined : f.savedValue ?? ""}
              autoComplete={f.secret ? "new-password" : "off"}
              spellCheck={false}
              placeholder={
                f.secret
                  ? f.savedHere
                    ? "Saved. Leave empty to keep it"
                    : f.inEnv
                      ? "Leave empty to keep using the Coolify value"
                      : "Paste it here"
                  : f.inEnv
                    ? "Leave empty to keep using the Coolify value"
                    : ""
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              {f.hint ? <span className="text-xs text-ink-3">{f.hint}</span> : <span />}
              {f.secret && f.savedHere ? (
                <label className="flex items-center gap-1.5 text-xs text-ink-3">
                  <input type="checkbox" name={`clear:${f.name}`} className="h-3.5 w-3.5" />
                  Delete the saved value{f.inEnv ? " (use Coolify's)" : ""}
                </label>
              ) : null}
            </div>
          </div>
        )
      })}
      {flags.length ? (
        <ul className="flex flex-col gap-1 rounded-md bg-bg px-3 py-2">
          {flags.map((f) => (
            <li key={f.name} className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
              <span className="text-ink-2">
                {f.label} <span className="font-mono text-[11px] text-ink-3">{f.name}</span>
              </span>
              <SourceNote f={f} />
              {f.hint ? <span className="w-full text-xs text-ink-3">{f.hint}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <Result state={state} />
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? "Testing the connection…" : "Test and save"}
      </Button>
      <p className="text-xs text-ink-3">
        Secrets are stored encrypted and never shown again. Saved values take over from Coolify&apos;s straight away, with no redeploy.
      </p>
    </form>
  )
}

function EnvOnlyList({ fields }: { fields: IntegrationCardField[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[13px] text-ink-3">Keys for this provider are managed in Coolify (they move real money). Only the switch is here.</p>
      <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
        {fields.map((f) => (
          <li key={f.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <span className="font-mono text-[12px] text-ink-2">
              {f.name}
              {f.required ? "" : <span className="text-ink-4"> (optional)</span>}
            </span>
            <span className={cn("font-mono text-[11px]", f.inEnv ? "text-success" : f.required ? "text-warning" : "text-ink-4")}>
              {f.inEnv ? "Set" : "Not set"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * One integration: status, its own on/off switch, and only its own settings.
 * `children` replaces the settings form (Chatwoot keeps its dedicated form).
 */
export function IntegrationCard({
  model,
  switchAction,
  saveAction,
  canEdit,
  children,
  footer,
}: {
  model: IntegrationCardModel
  switchAction: ServerAction
  saveAction: ServerAction
  canEdit: boolean
  children?: ReactNode
  footer?: ReactNode
}) {
  const [open, setOpen] = useState(model.mode === "full" && model.switchedOn && model.missing.length > 0)
  const hasBody = model.mode === "switch" || Boolean(children) || model.fields.length > 0
  return (
    <section id={`integration-${model.id}`} className="scroll-mt-6 rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4 p-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-ink">{model.label}</h3>
            <Pill tone={model.tone}>{model.badge}</Pill>
            {model.readiness ? <Pill tone={model.readiness.tone}>{model.readiness.badge}</Pill> : null}
          </div>
          <p className="text-[13px] text-ink-3">{model.purpose}</p>
          <p className="text-[13px] leading-relaxed text-ink-2">
            {model.summary}
            {model.readiness ? <span className="text-ink-3"> {model.readiness.detail}</span> : null}
            {model.readiness ? (
              <a href="#payment-readiness" className="text-accent hover:underline">
                {" "}
                Go-live checklist
              </a>
            ) : null}
          </p>
          {model.oneAtATime ? <p className="text-[12px] text-ink-4">One provider at a time: switching this on switches the others off.</p> : null}
        </div>
        <SwitchForm id={model.id} label={model.label} on={model.switchedOn} action={switchAction} disabled={!canEdit} />
      </div>
      {hasBody ? (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-semibold text-ink-2 hover:bg-bg"
          >
            {model.mode === "switch" ? "Settings in Coolify" : "Settings"}
            <span className="font-mono text-[11px] text-ink-3">{open ? "Hide" : `${model.fields.length} field${model.fields.length === 1 ? "" : "s"}`}</span>
          </button>
          {open ? (
            <div className="flex flex-col gap-4 px-4 pb-4">
              {children ??
                (model.mode === "switch" ? (
                  <EnvOnlyList fields={model.fields} />
                ) : canEdit ? (
                  <SettingsForm model={model} action={saveAction} />
                ) : (
                  <EnvOnlyList fields={model.fields} />
                ))}
              {footer}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
