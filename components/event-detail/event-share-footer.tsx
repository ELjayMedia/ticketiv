"use client"

import { Share2, Heart, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface EventShareFooterProps {
  eventTitle: string
  eventId: string
  initialFavourited?: boolean
}

export function EventShareFooter({ eventTitle, eventId, initialFavourited = false }: EventShareFooterProps) {
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
    <section aria-label="Share this event" className="pt-2">
      <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
        Know someone who&apos;d love this?
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleShare}
          aria-label="Share event"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Share
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleFavourite}
          disabled={favouriteLoading}
          aria-label={isFavourited ? "Remove from saved events" : "Save event"}
        >
          <Heart
            className="h-4 w-4"
            aria-hidden="true"
            fill={isFavourited ? "currentColor" : "none"}
            style={{ color: isFavourited ? "hsl(var(--primary))" : undefined }}
          />
          {isFavourited ? "Saved" : "Save"}
        </Button>
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={handleCopyLink}
          aria-label="Copy event link"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Copy link
        </Button>
      </div>
    </section>
  )
}
