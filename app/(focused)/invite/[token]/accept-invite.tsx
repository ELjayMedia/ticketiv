"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { acceptInviteAction } from "./actions"

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onAccept() {
    setError(null)
    startTransition(async () => {
      const res = await acceptInviteAction(token)
      if (res.ok && res.redirectTo) {
        router.push(res.redirectTo)
      } else {
        setError(res.error ?? "Something went wrong")
      }
    })
  }

  return (
    <Card className="w-full max-w-sm p-6 text-center">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name="users" size={24} />
      </span>
      <h1 className="mt-4 text-h2 text-[20px]">You&apos;ve been invited</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        Accept to join the team. Access is added to the account you&apos;re signed in with.
      </p>

      {error && (
        <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[11px] text-danger" role="status">
          <Icon name="close" size={13} />
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="accent"
        size="md"
        block
        className="mt-5"
        disabled={pending}
        onClick={onAccept}
      >
        {pending ? "Accepting…" : "Accept invite"}
      </Button>
    </Card>
  )
}
