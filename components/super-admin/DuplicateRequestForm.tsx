"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

/** Support's choices: pass to the original organiser, approve, or decline. */
export function DuplicateRequestForm({
  action,
  requestId,
  canForward,
  originalOrgName,
}: {
  action: ServerAction
  requestId: string
  canForward: boolean
  originalOrgName: string
}) {
  const [note, setNote] = useState("")
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-ink">Note</span>
        <textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={`Shown to ${originalOrgName} if you pass it on, and to the requester if you decide. Required to decline.`}
          className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {canForward ? (
          <Button type="submit" name="intent" value="forward" variant="accent" size="sm" disabled={pending}>
            Send to {originalOrgName}
          </Button>
        ) : null}
        <Button type="submit" name="intent" value="approve" variant="outline" size="sm" disabled={pending}>
          Approve
        </Button>
        <Button type="submit" name="intent" value="decline" variant="outline" size="sm" disabled={pending || note.trim().length < 5}>
          Decline
        </Button>
      </div>
      {state.status !== "idle" ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={cn("rounded-md px-3 py-2 text-[13px]", state.status === "done" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
