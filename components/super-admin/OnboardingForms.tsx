"use client"

import { useActionState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

const INPUT =
  "min-h-[40px] rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[14px] text-ink outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="text-[12px] text-ink-3">{hint}</span> : null}
    </label>
  )
}

function Note({ placeholder }: { placeholder: string }) {
  return (
    <Field label="Note for the audit log">
      <textarea name="note" rows={2} required minLength={5} maxLength={2000} placeholder={placeholder} className={INPUT} />
    </Field>
  )
}

/** Create an organiser (organisation) and give it an owner by email. */
export function CreateOrganizerForm({ action }: { action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Organiser name">
          <input name="name" required minLength={2} maxLength={120} className={INPUT} />
        </Field>
        <Field label="Owner's email" hint="New emails get an account and a link to choose a password.">
          <input name="email" type="email" required autoComplete="off" maxLength={320} className={INPUT} />
        </Field>
      </div>
      <Note placeholder="e.g. Onboarding call with the promoter on 26 Nov; they asked us to set it up." />
      <div>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create organiser"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}

/** Create a draft event for an organiser, optionally with an event admin. */
export function CreateEventForm({ action, organisations, defaultOrgId }: { action: ServerAction; organisations: { id: string; name: string }[]; defaultOrgId?: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Organiser">
          <select name="orgId" required defaultValue={defaultOrgId ?? ""} className={INPUT}>
            <option value="" disabled>
              Choose an organiser…
            </option>
            {organisations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Event title">
          <input name="title" required minLength={2} maxLength={200} className={INPUT} />
        </Field>
      </div>
      <Field
        label="Event admin's email (optional)"
        hint="They can edit and run this event, and join the organiser's door team (scanning, guestlist) but not its other events' settings, money or team. New emails get an account and a link to choose a password."
      >
        <input name="email" type="email" autoComplete="off" maxLength={320} className={INPUT} />
      </Field>
      <Note placeholder="e.g. Setting this up for the organiser while they finish onboarding." />
      <div>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create and open the editor"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}

/** Make someone the admin of an existing event. */
export function AssignEventAdminForm({ action, eventId }: { action: ServerAction; eventId: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Email" hint="They can edit and run this event, and join the organiser's door team, but not its other events' settings, money or team. New emails get an account and a link to choose a password.">
        <input name="email" type="email" required autoComplete="off" maxLength={320} className={INPUT} />
      </Field>
      <Note placeholder="Why this person is running the event." />
      <div>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Assigning…" : "Make event admin"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}
