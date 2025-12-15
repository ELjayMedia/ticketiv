"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface EventCountdownProps {
  eventDate: string
}

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function EventCountdown({ eventDate }: EventCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const eventTime = new Date(eventDate).getTime()
      const difference = eventTime - now

      if (difference <= 0) {
        setIsExpired(true)
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeRemaining({ days, hours, minutes, seconds })
    }

    calculateTimeRemaining()
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [eventDate])

  if (isExpired) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center gap-3">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <p className="font-semibold text-muted-foreground">Event has started</p>
        </CardContent>
      </Card>
    )
  }

  if (!timeRemaining) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center gap-3">
          <Clock className="w-5 h-5 text-primary animate-pulse" />
          <p className="font-semibold">Loading countdown...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <p className="text-sm text-muted-foreground">Time Until Event</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center">
            <div className="bg-primary/10 rounded-lg p-3 mb-1">
              <p className="text-2xl font-bold text-primary">{timeRemaining.days}</p>
            </div>
            <p className="text-xs text-muted-foreground">Days</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-lg p-3 mb-1">
              <p className="text-2xl font-bold text-primary">{timeRemaining.hours}</p>
            </div>
            <p className="text-xs text-muted-foreground">Hours</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-lg p-3 mb-1">
              <p className="text-2xl font-bold text-primary">{timeRemaining.minutes}</p>
            </div>
            <p className="text-xs text-muted-foreground">Mins</p>
          </div>
          <div className="text-center">
            <div className="bg-primary/10 rounded-lg p-3 mb-1">
              <p className="text-2xl font-bold text-primary">{timeRemaining.seconds}</p>
            </div>
            <p className="text-xs text-muted-foreground">Secs</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
