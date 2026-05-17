"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
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
      variant={following ? "secondary" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={following}
    >
      {following ? (
        <>
          <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Following
        </>
      ) : (
        <>
          <Bell className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Follow
        </>
      )}
    </Button>
  )
}
