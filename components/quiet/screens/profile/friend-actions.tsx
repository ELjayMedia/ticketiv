"use client"

import { useState, useTransition } from "react"

import {
  blockUserAction,
  cancelFriendRequestAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
  unblockUserAction,
  unfriendAction,
  type FriendActionResult,
  type FriendRelationshipState,
} from "@/app/(consumer)/friends/actions"
import { Button } from "@/components/quiet/ui/button"

export function FriendActions({
  handle,
  initialState,
}: {
  handle: string
  initialState: FriendRelationshipState
}) {
  const [state, setState] = useState<FriendRelationshipState>(initialState)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<FriendActionResult>) {
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setMessage(result.error ?? "Could not update friendship.")
        return
      }
      if (result.state) setState(result.state)
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
      </div>

      {message ? (
        <p role="status" className="font-mono text-[10px] text-danger">
          {message}
        </p>
      ) : null}
    </div>
  )
}
