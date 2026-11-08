"use client"

import { useActionState, useId } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label, controlClassName } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

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

/** Record (or replace) the proof for one checklist item. */
export function RecordEvidenceForm({
  action,
  provider,
  items,
  defaultItem,
}: {
  action: ServerAction
  provider: string
  items: Array<{ id: string; label: string; hint: string; recorded: boolean }>
  defaultItem?: string
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const id = useId()
  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-line bg-surface-2 p-3">
      <input type="hidden" name="provider" value={provider} />
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-item`}>Checklist item</Label>
        <select id={`${id}-item`} name="item" defaultValue={defaultItem ?? items.find((i) => !i.recorded)?.id ?? items[0]?.id} className={controlClassName()}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
              {item.recorded ? " (replace)" : ""}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-ref`}>Where the proof lives</Label>
        <Input id={`${id}-ref`} name="ref" required maxLength={500} autoComplete="off" placeholder="Link, Jira key (TICK-123) or document reference" />
        <span className="text-xs text-ink-3">Never paste a key, token or password here. Point to where the proof is kept.</span>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={`${id}-note`}>Note (optional)</Label>
        <Input id={`${id}-note`} name="note" maxLength={500} autoComplete="off" placeholder="e.g. Signed 3 Nov by both parties" />
      </div>
      <Result state={state} />
      <Button type="submit" variant="default" size="sm" disabled={pending} className="self-start">
        {pending ? "Saving…" : "Save evidence"}
      </Button>
    </form>
  )
}

export function RemoveEvidenceButton({ action, provider, item, label }: { action: ServerAction; provider: string; item: string; label: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="provider" value={provider} />
      <input type="hidden" name="item" value={item} />
      <Button type="submit" variant="ghost" size="xs" disabled={pending} aria-label={`Remove evidence for ${label}`}>
        {pending ? "Removing…" : "Remove"}
      </Button>
      {state.status === "error" ? <Result state={state} /> : null}
    </form>
  )
}

/** Approve, revoke or lift a block: each needs a written reason. */
export function ReasonActionForm({
  action,
  provider,
  label,
  pendingLabel,
  placeholder,
  variant = "default",
  disabled,
}: {
  action: ServerAction
  provider: string
  label: string
  pendingLabel: string
  placeholder: string
  variant?: "default" | "accent" | "outline"
  disabled?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const id = useId()
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="provider" value={provider} />
      <Label htmlFor={`${id}-reason`} className="sr-only">
        Reason
      </Label>
      <Input id={`${id}-reason`} name="reason" required minLength={10} maxLength={500} disabled={disabled} placeholder={placeholder} autoComplete="off" />
      <Result state={state} />
      <Button type="submit" variant={variant} size="sm" disabled={pending || disabled} className="self-start">
        {pending ? pendingLabel : label}
      </Button>
    </form>
  )
}

/**
 * Emergency disable: one click. The reason is prefilled so the button works
 * immediately; it can be edited first when there is time.
 */
export function EmergencyDisableForm({ action, provider, label }: { action: ServerAction; provider: string; label: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const id = useId()
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="provider" value={provider} />
      <Label htmlFor={`${id}-reason`} className="text-[12px] text-ink-3">
        Reason (prefilled, edit if you have time)
      </Label>
      <Input id={`${id}-reason`} name="reason" required minLength={10} maxLength={500} defaultValue="Emergency disable from the admin console" autoComplete="off" />
      <Result state={state} />
      <Button
        type="submit"
        variant="default"
        size="sm"
        disabled={pending}
        className="self-start border-danger bg-danger text-white hover:bg-danger hover:opacity-90"
      >
        {pending ? "Disabling…" : `Disable ${label} now`}
      </Button>
    </form>
  )
}
