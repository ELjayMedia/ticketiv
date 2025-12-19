"use client"

import { useEffect, useState } from "react"
import { WifiOff, Wifi } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setWasOffline(true)
      // Auto-hide "back online" message after 3 seconds
      setTimeout(() => setWasOffline(false), 3000)
    }

    const handleOffline = () => {
      setIsOffline(true)
      setWasOffline(false)
    }

    setIsOffline(!navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Show "back online" message
  if (wasOffline && !isOffline) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-50">
        <Wifi className="h-4 w-4" />
        <AlertDescription>You're back online!</AlertDescription>
      </Alert>
    )
  }

  // Show offline message
  if (isOffline) {
    return (
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0 animate-in slide-in-from-top-2">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>You're offline. Some features may be unavailable.</AlertDescription>
      </Alert>
    )
  }

  return null
}
