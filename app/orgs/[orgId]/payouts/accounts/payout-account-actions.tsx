"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/quiet/ui/button"
import { deletePayoutAccountAction, setPrimaryPayoutAccountAction } from "./actions"

/** Make primary / Remove for one payout account (org owners and admins). */
export function PayoutAccountActions({
  orgId,
  accountId,
  label,
  isPrimary,
  isOnlyAccount,
}: {
  orgId: string
  accountId: string
  label: string
  isPrimary: boolean
  isOnlyAccount: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<void>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setConfirming(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.")
      }
    })
  }

  const removeNote = isOnlyAccount
    ? "You won't be able to request payouts until you add another account."
    : isPrimary
      ? "Your oldest other account becomes the primary account."
      : null

  return (
    <div className="flex flex-col items-end gap-2">
      {confirming ? (
        <div className="flex flex-col items-end gap-2 text-right">
          <p className="text-[12px] text-ink-2">
            Remove {label}?{removeNote ? ` ${removeNote}` : ""}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="xs" disabled={pending} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={pending}
              className="border-danger/40 text-danger hover:bg-danger-soft"
              onClick={() => run(() => deletePayoutAccountAction(orgId, accountId))}
            >
              {pending ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {!isPrimary && (
            <Button
              variant="outline"
              size="xs"
              disabled={pending}
              onClick={() => run(() => setPrimaryPayoutAccountAction(orgId, accountId))}
            >
              {pending ? "Saving…" : "Make primary"}
            </Button>
          )}
          <Button variant="ghost" size="xs" disabled={pending} onClick={() => setConfirming(true)}>
            Remove
          </Button>
        </div>
      )}
      {error && <p className="max-w-[260px] text-right text-[12px] text-danger">{error}</p>}
    </div>
  )
}
