"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  blockUserAction,
  cancelFriendRequestAction,
  reportUserAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
  unblockUserAction,
  unfriendAction,
  type FriendActionResult,
  type FriendRelationshipState,
} from "@/app/(consumer)/friends/actions"
import { Button } from "@/components/quiet/ui/button"

type Feedback = { kind: "success" | "error"; text: string }

export function FriendActions({
  handle,
  initialState,
}: {
  handle: string
  initialState: FriendRelationshipState
}) {
  const router = useRouter()
  const [state, setState] = useState<FriendRelationshipState>(initialState)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<FriendActionResult>) {
    setFeedback(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setFeedback({ kind: "error", text: result.error ?? "Could not update friendship." })
        return
      }
      if (result.state) setState(result.state)
      router.refresh()
    })
  }

  function block() {
    if (!window.confirm(`Block @${handle}? You will no longer appear in each other's Friends activity.`)) {
      return
    }
    run(() => blockUserAction(handle))
  }

  function unfriend() {
    if (!window.confirm(`Remove @${handle} from your friends?`)) return
    run(() => unfriendAction(handle))
  }

  function report() {
    const reason = window.prompt(
      `Why are you reporting @${handle}? Please don't include passwords, payment details or other sensitive information.`,
    )
    if (!reason?.trim()) return

    setFeedback(null)
    startTransition(async () => {
      const result = await reportUserAction(handle, reason)
      setFeedback(
        result.ok
          ? { kind: "success", text: "Report sent. Blocking is separate if you also want to stop interaction." }
          : { kind: "error", text: result.error ?? "Could not send this report." },
      )
    })
  }

  return (
    <div className="flex w-full max-w-[340px] flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {state === "none" ? (
          <Button
            type="button"
            variant="accent"
            size="sm"
            disabled={pending}
            onClick={() => run(() => sendFriendRequestAction(handle))}
          >
            {pending ? "Sending…" : "Add friend"}
          </Button>
        ) : null}

        {state === "outgoing_pending" ? (
          <>
            <Button type="button" variant="default" size="sm" disabled>
              Requested
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => cancelFriendRequestAction(handle))}
              className="font-mono text-[11px] font-semibold text-ink-3 hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        ) : null}

        {state === "incoming_pending" ? (
          <>
            <Button
              type="button"
              variant="accent"
              size="sm"
              disabled={pending}
              onClick={() => run(() => respondFriendRequestAction(handle, true))}
            >
              Accept
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={pending}
              onClick={() => run(() => respondFriendRequestAction(handle, false))}
            >
              Decline
            </Button>
          </>
        ) : null}

        {state === "friends" ? (
          <>
            <Button type="button" variant="default" size="sm" disabled>
              Friends ✓
            </Button>
            <button
              type="button"
              disabled={pending}
              onClick={unfriend}
              className="font-mono text-[11px] font-semibold text-ink-3 hover:text-ink disabled:opacity-50"
            >
              Unfriend
            </button>
          </>
        ) : null}

        {state === "blocked_by_me" ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={pending}
            onClick={() => run(() => unblockUserAction(handle))}
          >
            {pending ? "Updating…" : "Unblock"}
          </Button>
        ) : null}

        {state === "unavailable" ? (
          <Button type="button" variant="default" size="sm" disabled>
            Requests unavailable
          </Button>
        ) : null}

        {state !== "blocked_by_me" ? (
          <button
            type="button"
            disabled={pending}
            onClick={block}
            className="font-mono text-[11px] font-semibold text-ink-3 hover:text-danger disabled:opacity-50"
          >
            Block
          </button>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={report}
          className="font-mono text-[11px] font-semibold text-ink-3 hover:text-danger disabled:opacity-50"
        >
          Report
        </button>
      </div>

      {feedback ? (
        <p
          role="status"
          className={`font-mono text-[10px] ${feedback.kind === "error" ? "text-danger" : "text-accent"}`}
        >
          {feedback.text}
        </p>
      ) : null}
    </div>
  )
}
