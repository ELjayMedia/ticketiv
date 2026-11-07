"use client"

import { useActionState, useId, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label, Textarea } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, MIN_REASON_LENGTH, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

export interface GuardedField {
  name: string
  label: string
  type?: "email" | "text" | "select"
  placeholder?: string
  defaultValue?: string
  required?: boolean
  hint?: string
  options?: Array<{ value: string; label: string }>
}

interface GuardedActionProps {
  label: string
  hint: string
  action: ServerAction
  hidden: Record<string, string>
  fields?: GuardedField[]
  /** Explains what will happen, shown when the form opens. */
  explain?: string
  confirmLabel?: string
  requiresReason?: boolean
  /** When set, the action is shown but can't be used (role gate). */
  lockedReason?: string
  tag?: string
}

/**
 * One support action: a button that opens a short form asking why, then runs
 * the server action and says what happened. Used on the order and person pages.
 */
export function GuardedAction({
  label,
  hint,
  action,
  hidden,
  fields = [],
  explain,
  confirmLabel,
  requiresReason = true,
  lockedReason,
  tag,
}: GuardedActionProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [state, formAction, pending] = useActionState(async (prev: ConsoleActionResult, formData: FormData) => {
    const result = await action(prev, formData)
    if (result.status === "done") {
      setOpen(false)
      setReason("")
    }
    return result
  }, IDLE_RESULT)
  const id = useId()

  const reasonOk = !requiresReason || reason.trim().length >= MIN_REASON_LENGTH

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => !lockedReason && setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`${id}-form`}
        disabled={Boolean(lockedReason)}
        className={cn(
          "flex min-h-[52px] w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
          open ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:border-line-2 hover:bg-bg",
          lockedReason && "cursor-not-allowed opacity-70 hover:bg-surface",
        )}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-ink">{label}</span>
          <span className="text-xs text-ink-3">{lockedReason ?? hint}</span>
        </span>
        {tag || lockedReason ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              lockedReason ? "bg-surface-2 text-ink-3" : "bg-warning-soft text-warning",
            )}
          >
            {lockedReason ? "Not your role" : tag}
          </span>
        ) : null}
      </button>

      {open ? (
        <form id={`${id}-form`} action={formAction} className="flex flex-col gap-3 rounded-lg border border-line bg-bg p-3">
          {explain ? <p className="text-[13px] leading-relaxed text-ink-2">{explain}</p> : null}
          {Object.entries(hidden).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-1">
              <Label htmlFor={`${id}-${field.name}`}>{field.label}</Label>
              {field.type === "select" ? (
                <select
                  id={`${id}-${field.name}`}
                  name={field.name}
                  defaultValue={field.defaultValue}
                  className="w-full rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium"
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`${id}-${field.name}`}
                  name={field.name}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  defaultValue={field.defaultValue}
                  required={field.required}
                />
              )}
              {field.hint ? <span className="text-xs text-ink-3">{field.hint}</span> : null}
            </div>
          ))}
          {requiresReason ? (
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-reason`}>Reason (saved to the audit log)</Label>
              <Textarea
                id={`${id}-reason`}
                name="reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Buyer confirmed their new email on Chatwoot"
                maxLength={500}
              />
              <span className="text-xs text-ink-3">
                {reasonOk ? "This is what the next person will read." : `At least ${MIN_REASON_LENGTH} characters.`}
              </span>
            </div>
          ) : null}
          {state.status === "error" ? (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
              {state.message}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" size="sm" disabled={!reasonOk || pending}>
              {pending ? "Working…" : confirmLabel ?? label}
            </Button>
          </div>
        </form>
      ) : null}

      {!open && state.status !== "idle" ? (
        <p
          role="status"
          className={cn(
            "rounded-md px-3 py-2 text-[13px]",
            state.status === "done" ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  )
}

/** Internal notes on an order or person. */
export function NoteForm({ action, subjectType, subjectId }: { action: ServerAction; subjectType: "order" | "person" | "event" | "organization"; subjectId: string }) {
  const [body, setBody] = useState("")
  const [state, formAction, pending] = useActionState(async (prev: ConsoleActionResult, formData: FormData) => {
    const result = await action(prev, formData)
    if (result.status === "done") setBody("")
    return result
  }, IDLE_RESULT)
  const id = useId()

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="subjectType" value={subjectType} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <Label htmlFor={`${id}-note`}>Add a note</Label>
      <Textarea
        id={`${id}-note`}
        name="body"
        rows={2}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Only admins see notes"
        maxLength={4000}
      />
      {state.status === "error" ? (
        <p role="alert" className="text-[13px] text-danger">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={!body.trim() || pending}>
        {pending ? "Saving…" : "Add note"}
      </Button>
    </form>
  )
}
