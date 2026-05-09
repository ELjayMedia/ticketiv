"use client"

import Link from "next/link"
import { ArrowLeft, Share2, Heart, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface EventActionRowProps {
  eventTitle: string
  eventId: string
  initialFavourited?: boolean
  backHref?: string
}

export function EventActionRow({
  eventTitle,
  eventId,
  initialFavourited = false,
  backHref = "/browse",
}: EventActionRowProps) {
  const [isFavourited, setIsFavourited] = useState(initialFavourited)
  const [favouriteLoading, setFavouriteLoading] = useState(false)

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: eventTitle, url: window.location.href })
      } catch {
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  function handleCopyLink() {
    if (typeof navigator !== "undefined") {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("Link copied to clipboard"))
        .catch(() => toast.error("Could not copy link"))
    }
  }

  async function handleFavourite() {
    if (favouriteLoading) return
    setFavouriteLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast("Sign in to save events")
      setFavouriteLoading(false)
      return
    }

    if (isFavourited) {
      await supabase
        .from("event_favourites")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId)
      setIsFavourited(false)
      toast("Removed from saved events")
    } else {
      await supabase
        .from("event_favourites")
        .insert({ user_id: user.id, event_id: eventId })
      setIsFavourited(true)
      toast.success("Saved to your events")
    }

    setFavouriteLoading(false)
  }

  return (
    <div className="flex items-center justify-between border-b border-border/40 bg-background px-4 py-3">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Back</span>
      </Link>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          aria-label="Share event"
          className="rounded-full"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleFavourite}
          disabled={favouriteLoading}
          aria-label={isFavourited ? "Remove from saved events" : "Save event"}
          className="rounded-full"
        >
          <Heart
            className="h-4 w-4 transition-colors"
            aria-hidden="true"
            fill={isFavourited ? "currentColor" : "none"}
            style={{ color: isFavourited ? "hsl(var(--primary))" : undefined }}
          />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopyLink}
          aria-label="Copy event link"
          className="rounded-full"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
