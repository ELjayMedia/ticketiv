"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { TrendingUp, AlertCircle } from "lucide-react"

export interface EventCardProps {
  id: string
  slug: string
  title: string
  startsAt: string
  venueName: string
  city: string
  posterUrl?: string
  minPrice: number
  currency?: string
  isTrending?: boolean
  isSoldOut?: boolean
}

export function EventCard({
  id,
  slug,
  title,
  startsAt,
  venueName,
  city,
  posterUrl,
  minPrice,
  currency = "USD",
  isTrending = false,
  isSoldOut = false,
}: EventCardProps) {
  const nextDate = new Date(startsAt)

  return (
    <Link href={`/events/${slug}`}>
      <Card className="overflow-hidden transition-transform hover:scale-105 cursor-pointer">
        {/* Poster Image */}
        <div className="relative h-48 w-full bg-muted overflow-hidden">
          {posterUrl ? (
            <Image
              src={posterUrl || "/placeholder.svg"}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No image
            </div>
          )}
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-2 flex-wrap">
            {isTrending && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending
              </Badge>
            )}
            {isSoldOut && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Sold Out
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">{title}</h3>

          {/* Date and Location */}
          <div className="space-y-1 mb-3">
            <p className="text-sm text-muted-foreground">
              {formatDate(nextDate)}
            </p>
            <p className="text-sm text-muted-foreground">
              {venueName}, {city}
            </p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold">
              {currency === "USD" ? "$" : currency}
              {(minPrice / 100).toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">from</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
