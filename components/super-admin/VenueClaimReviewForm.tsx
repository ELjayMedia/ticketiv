"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { cn } from "@/lib/cn"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

/** Approve / reject a venue claim; "replace owner" only when one exists. */
export function VenueClaimReviewForm({ action, claimId, ownerConflict }: { action: ServerAction; claimId: string; ownerConflict: boolean }) {
  const [note, setNote] = useState("")
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  const noteOk = note.trim().length >= 5

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="claimId" value={claimId} />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-ink">Note</span>
        <textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="How you verified the request. The requester sees this. Required to reject or replace an owner."
          className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {ownerConflict ? (
          <Button type="submit" name="intent" value="approve_replace" variant="outline" size="sm" disabled={pending || !noteOk}>
            Approve and replace owner
          </Button>
        ) : (
          <Button type="submit" name="intent" value="approve" variant="accent" size="sm" disabled={pending}>
            Approve
          </Button>
        )}
        <Button type="submit" name="intent" value="reject" variant="outline" size="sm" disabled={pending || !noteOk}>
          Reject
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
