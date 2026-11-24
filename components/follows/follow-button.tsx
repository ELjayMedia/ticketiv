"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { setFollowAction, type FollowKind } from "@/app/(consumer)/follows/actions"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { publicFollowerCount } from "@/lib/follows/threshold"

/** Follow an organiser, artist or venue from its public page (TICK-434 / TICK-452). */
export function FollowButton({
  kind,
  id,
  name,
  initialFollowing,
  initialCount,
  signedIn,
  returnTo,
}: {
  kind: FollowKind
  id: string
  name: string
  initialFollowing: boolean
  initialCount: number
  signedIn: boolean
  returnTo: string
}) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(initialCount)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (!signedIn) {
      router.push(`/login?from=${encodeURIComponent(returnTo)}`)
      return
    }
    const next = !following
    setFollowing(next)
    setCount((c) => Math.max(0, c + (next ? 1 : -1)))
    setError("")
    startTransition(async () => {
      const res = await setFollowAction(kind, id, next)
      if (!res.ok) {
        setFollowing(!next)
        setCount((c) => Math.max(0, c + (next ? -1 : 1)))
        if (res.reason === "sign_in") router.push(`/login?from=${encodeURIComponent(returnTo)}`)
        else setError(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant={following ? "outline" : "primary"}
          size="sm"
          onClick={toggle}
          disabled={pending}
          aria-pressed={following}
          aria-label={following ? `Unfollow ${name}` : `Follow ${name}`}
        >
          <Icon name={following ? "check" : "bell"} size={14} />
          {following ? "Following" : "Follow"}
        </Button>
        {publicFollowerCount(count) !== null ? (
          <span className="font-mono text-[12px] text-ink-3">
            {count.toLocaleString("en-GB")} followers
          </span>
        ) : null}
      </div>
      {error ? (
        <span role="alert" className="text-[12px] text-danger">
          {error}
        </span>
      ) : null}
    </div>
  )
}
