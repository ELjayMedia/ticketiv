"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { toggleSeriesFollow } from "@/app/(public)/series/[slug]/actions"

interface SeriesFollowButtonProps {
  seriesId: string
  seriesSlug: string
  initialFollowing: boolean
  signedIn: boolean
}

export function SeriesFollowButton({
  seriesId,
  seriesSlug,
  initialFollowing,
  signedIn,
}: SeriesFollowButtonProps) {
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!signedIn) {
      router.push(`/login?next=/series/${seriesSlug}`)
      return
    }
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      const result = await toggleSeriesFollow(seriesId, seriesSlug, next)
      if (!result.ok) {
        setFollowing(!next)
        toast.error(result.error)
        return
      }
      toast.success(next ? "Following — we'll keep you posted" : "Unfollowed")
    })
  }

  return (
    <Button
      type="button"
      variant={following ? "outline" : "primary"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={following}
    >
      <Icon name={following ? "check" : "bell"} size={14} />
      {following ? "Following" : "Follow"}
    </Button>
  )
}
