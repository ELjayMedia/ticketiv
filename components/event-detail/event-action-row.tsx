"use client"

import Link from "next/link"
import { ArrowLeft, Share2, Heart, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"

interface EventActionRowProps {
  eventTitle: string
  backHref?: string
}

export function EventActionRow({ eventTitle, backHref = "/browse" }: EventActionRowProps) {
  const [isFavourited, setIsFavourited] = useState(false)

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: eventTitle, url: window.location.href })
      } catch {
        // User cancelled share
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
          aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
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
