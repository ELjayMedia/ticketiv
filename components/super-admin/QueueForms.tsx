"use client"

import { useActionState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { IDLE_RESULT, type ConsoleActionResult } from "@/lib/super-admin/console"

type ServerAction = (prev: ConsoleActionResult, formData: FormData) => Promise<ConsoleActionResult>

/** "Take it" / "Let go" on a work-queue item. */
export function TakeItemForm({ action, itemKey, mine, takenByOther }: { action: ServerAction; itemKey: string; mine: boolean; takenByOther: boolean }) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT)
  if (takenByOther) return null
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="itemKey" value={itemKey} />
      {mine ? <input type="hidden" name="release" value="1" /> : null}
      <Button type="submit" size="xs" variant={mine ? "outline" : "default"} disabled={pending}>
        {pending ? "…" : mine ? "Let go" : "Take it"}
      </Button>
      {state.status === "error" ? (
        <span role="alert" className="text-xs text-danger">
          {state.message}
        </span>
      ) : null}
    </form>
  )
}
