"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { claimGuestOrdersAction } from "@/app/(consumer)/tickets/claim-actions"

/**
 * Shown when the signed-in user has guest orders (bought under a previous
 * anonymous session) matching their verified email/phone. Confirm-to-claim.
 */
export function ClaimGuestOrdersCard({ count }: { count: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  function onClaim() {
    setResult(null)
    startTransition(async () => {
      const res = await claimGuestOrdersAction()
      setResult({ ok: res.ok, message: res.message })
      if (res.ok && res.claimed > 0) router.refresh()
    })
  }

  if (result?.ok) {
    return (
      <Card className="flex items-center gap-3 p-4" flat>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="check" size={18} />
        </span>
        <p className="text-[13px] text-ink">{result.message}</p>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="ticket" size={18} />
        </span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-semibold text-ink">
            We found {count} past order{count === 1 ? "" : "s"}
          </span>
          <span className="font-mono text-[11px] leading-relaxed text-ink-3">
            Bought as a guest with your verified contact. Add {count === 1 ? "it" : "them"} to this
            account?
          </span>
        </div>
      </div>

      {result && !result.ok && (
        <p className="flex items-center gap-1.5 font-mono text-[11px] text-danger" role="status">
          <Icon name="close" size={13} />
          {result.message}
        </p>
      )}

      <Button type="button" variant="primary" size="sm" disabled={pending} onClick={onClaim}>
        {pending ? "Adding…" : `Claim ${count === 1 ? "order" : "orders"}`}
      </Button>
    </Card>
  )
}
