"use client"

import { useActionState, useState } from "react"

import type { DecideResult } from "@/app/orgs/[orgId]/permission-requests/actions"
import { Button } from "@/components/quiet/ui/button"

type Action = (prev: DecideResult, formData: FormData) => Promise<DecideResult>

export function DuplicateDecisionForm({ action, orgId, requestId, requesterName }: { action: Action; orgId: string; requestId: string; requesterName: string }) {
  const [note, setNote] = useState("")
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as DecideResult)

  if (state.status === "done") {
    return <p className="rounded-[var(--radius)] bg-success-soft px-3 py-2 text-[13px] text-success">{state.message}</p>
  }

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="requestId" value={requestId} />
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold">Note to {requesterName} (optional)</span>
        <textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="approve" variant="accent" size="sm" disabled={pending}>
          Approve
        </Button>
        <Button type="submit" name="decision" value="decline" variant="outline" size="sm" disabled={pending}>
          Decline
        </Button>
      </div>
      {state.status === "error" ? (
        <p role="alert" className="rounded-[var(--radius)] bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
