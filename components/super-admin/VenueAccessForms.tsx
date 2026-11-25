"use client"

import { useActionState, useState } from "react"

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

/** Add a venue that isn't in the directory yet. */
export function CreateVenueForm({ action }: { action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <Field label="Venue name">
        <input name="name" required maxLength={160} className={INPUT} />
      </Field>
      <Field label="City or town">
        <input name="city" required maxLength={80} className={INPUT} />
      </Field>
      <Field label="Address (optional)">
        <input name="address" maxLength={300} className={INPUT} />
      </Field>
      <Field label="Capacity (optional)">
        <input name="capacity" type="number" min={1} max={200000} inputMode="numeric" className={INPUT} />
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <div>
          <Button type="submit" variant="primary" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add venue"}
          </Button>
        </div>
        <Result state={state} />
      </div>
    </form>
  )
}

/** Give a person venue access by email. New emails get an account and a set-password link. */
export function AssignVenueAdminForm({ action, venueId, verified, hasOwner }: { action: ServerAction; venueId: string; verified: boolean; hasOwner: boolean }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const [role, setRole] = useState(hasOwner ? "venue_manager" : "venue_owner")
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Field label="Email" hint="If they don't have a Ticketiv account yet, we create one and email a link to choose a password.">
          <input name="email" type="email" required autoComplete="off" maxLength={320} className={INPUT} />
        </Field>
        <Field label="Role">
          <select name="role" value={role} onChange={(e) => setRole(e.target.value)} className={INPUT}>
            <option value="venue_owner">Owner (venue admin)</option>
            <option value="venue_manager">Manager</option>
            <option value="venue_staff">Staff (view only)</option>
          </select>
        </Field>
      </div>
      {role === "venue_owner" && hasOwner ? (
        <p className="rounded-md bg-warning-soft px-3 py-2 text-[13px] text-warning">
          This venue already has an owner. They&apos;ll become a manager; nobody loses access.
        </p>
      ) : null}
      <Field label="Note for the audit log">
        <textarea
          name="note"
          rows={2}
          required
          minLength={5}
          maxLength={2000}
          placeholder="How you confirmed this person works for the venue (e.g. onboarding call with the GM on 25 Nov)."
          className={INPUT}
        />
      </Field>
      {!verified ? (
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" name="verify" defaultChecked className="h-4 w-4 accent-[var(--color-accent)]" />
          Mark the venue verified, so organisers can find it and send booking requests
        </label>
      ) : null}
      <div>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Giving access…" : "Give access"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}

export function RemoveVenueAdminForm({ action, venueId, userId, label }: { action: ServerAction; venueId: string; userId: string; label: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)} aria-label={`Remove ${label}`}>
        Remove
      </Button>
    )
  }
  return (
    <form action={formAction} className="flex w-full flex-col gap-2 sm:w-72">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="userId" value={userId} />
      <input name="note" required minLength={5} maxLength={2000} placeholder="Why (audit log)" className={INPUT} aria-label="Reason for removing access" />
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="xs" disabled={pending}>
          {pending ? "Removing…" : "Remove access"}
        </Button>
        <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}
