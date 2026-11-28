"use client"

import { useActionState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

const inputClass =
  "rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 font-mono text-[13px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

function Result({ state }: { state: ConsoleActionResult }) {
  if (state.status === "idle") return null
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={cn("rounded-md px-3 py-2 text-[13px]", state.status === "done" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
      {state.message}
    </p>
  )
}

export function MergeArtistsForm({ action }: { action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink">Merge a duplicate profile</span>
      <input name="sourceId" placeholder="Duplicate artist ID (removed)" className={inputClass} autoComplete="off" />
      <input name="targetId" placeholder="Canonical artist ID (kept)" className={inputClass} autoComplete="off" />
      <input name="note" placeholder="Why they are the same artist" className={inputClass} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Merging…" : "Merge"}
      </Button>
      <Result state={state} />
    </form>
  )
}

export function ResetArtistOwnerForm({ action }: { action: ServerAction }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink">Roll back an approved claim</span>
      <input name="artistId" placeholder="Artist ID" className={inputClass} autoComplete="off" />
      <input name="note" placeholder="Why the owner is being removed" className={inputClass} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Removing…" : "Remove owner and managers"}
      </Button>
      <Result state={state} />
    </form>
  )
}
