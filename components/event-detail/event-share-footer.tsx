"use client"

import { Share2, Heart, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"

interface EventShareFooterProps {
  eventTitle: string
}

export function EventShareFooter({ eventTitle }: EventShareFooterProps) {
  const [isFavourited, setIsFavourited] = useState(false)

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

  function handleFavourite() {
    setIsFavourited((prev) => !prev)
    toast(isFavourited ? "Removed from favourites" : "Added to favourites")
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
          aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
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
