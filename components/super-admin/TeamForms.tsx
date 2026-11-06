"use client"

import { useActionState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import { ADMIN_ROLE_DESCRIPTIONS, ADMIN_ROLE_LABELS, IDLE_RESULT, INVITABLE_ROLES, type ConsoleActionResult } from "@/lib/super-admin/console"

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

export function InviteAdminForm({ action }: { action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="invite-email">Their email</Label>
        <Input id="invite-email" name="email" type="email" required placeholder="name@example.com" autoComplete="off" />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-label mb-2">Role</legend>
        {INVITABLE_ROLES.map((role, index) => (
          <label key={role} className="flex cursor-pointer gap-3 rounded-lg border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft/40">
            <input type="radio" name="role" value={role} defaultChecked={index === 0} className="mt-1 accent-[var(--color-accent)]" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink">{ADMIN_ROLE_LABELS[role]}</span>
              <span className="text-[13px] text-ink-3">{ADMIN_ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <p className="text-[13px] leading-relaxed text-ink-3">
        They get an email link to choose their own password (it works once). If they already have a Ticketiv account, they keep their
        password and simply gain access.
      </p>
      <Result state={state} />
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  )
}

export function ChangeRoleForm({ action, userId, role }: { action: ServerAction; userId: string; role: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`role-${userId}`}>
          Role
        </label>
        <select id={`role-${userId}`} name="role" defaultValue={role} className="rounded-md border border-line-2 bg-surface px-2 py-1.5 text-[13px]">
          {INVITABLE_ROLES.map((r) => (
            <option key={r} value={r}>
              {ADMIN_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <Button type="submit" size="xs" variant="outline" disabled={pending}>
          Save
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}

export function RowActionForm({ action, userId, label }: { action: ServerAction; userId: string; label: string }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        {pending ? "…" : label}
      </Button>
      <Result state={state} />
    </form>
  )
}
