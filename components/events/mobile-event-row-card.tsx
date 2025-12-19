"use client"

import type React from "react"

import Link from "next/link"
import { Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EventSummary } from "@/types"
import { formatCurrency } from "@/lib/pricing"
import { cn } from "@/lib/utils"

interface MobileEventRowCardProps {
  event: EventSummary
  onSave?: (eventId: string) => void
  isSaved?: boolean
}

function formatDateShort(date: string | null | undefined) {
  if (!date) return "Date TBA"
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date

  return (
    parsed.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " • " +
    parsed.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  )
}

function shouldShowBadge(event: EventSummary): { text: string; variant: "default" | "secondary" } | null {
  // Check if recently added (within last 7 days)
  const createdAt = new Date(event.starts_at || "")
  const now = new Date()
  const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceCreated <= 7) {
    return { text: "JUST ADDED", variant: "default" }
  }

  // Check if popular (more than 80% sold)
  if (event.tickets_sold && event.tickets_available) {
    const soldPercentage = (event.tickets_sold / (event.tickets_sold + event.tickets_available)) * 100
    if (soldPercentage >= 80) {
      return { text: "POPULAR", variant: "secondary" }
    }
  }

  return null
}

export function MobileEventRowCard({ event, onSave, isSaved = false }: MobileEventRowCardProps) {
  const priceLabel =
    event.minimum_price != null ? `From ${formatCurrency(event.minimum_price, event.currency)}` : "Free"

  const badge = shouldShowBadge(event)

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onSave?.(event.id)
  }

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-start gap-3 p-4 border-b bg-background hover:bg-accent/50 transition-colors min-h-[96px]"
    >
      {/* Left: Square thumbnail */}
      <div className="shrink-0">
        <img
          src={event.cover_image_url || "/placeholder.svg?height=72&width=72"}
          alt={event.title}
          className="w-[72px] h-[72px] object-cover rounded-lg"
        />
      </div>

      {/* Middle: Text stack */}
      <div className="flex-1 min-w-0 space-y-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{event.title}</h3>

        <p className="text-xs text-muted-foreground">
          {formatDateShort(event.starts_at)} • {event.venue_name || event.location || "TBA"}
        </p>

        <p className="text-xs font-medium">{priceLabel}</p>

        {badge && (
          <Badge variant={badge.variant} className="text-[10px] h-5 px-2 font-semibold">
            {badge.text}
          </Badge>
        )}
      </div>

      {/* Right: Heart icon button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn("shrink-0 h-11 w-11 rounded-full hover:bg-accent", isSaved && "text-primary")}
        onClick={handleSaveClick}
        aria-label={isSaved ? "Remove from saved" : "Save event"}
      >
        <Heart className={cn("h-5 w-5", isSaved && "fill-current")} />
      </Button>
    </Link>
  )
}
