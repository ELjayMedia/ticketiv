"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

export function PendingPaymentRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [seconds, setSeconds] = useState(Math.ceil(intervalMs / 1000))

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      router.refresh()
      setSeconds(Math.ceil(intervalMs / 1000))
    }, intervalMs)

    const countdownTimer = window.setInterval(() => {
      setSeconds((current) => (current <= 1 ? Math.ceil(intervalMs / 1000) : current - 1))
    }, 1000)

    return () => {
      window.clearInterval(refreshTimer)
      window.clearInterval(countdownTimer)
    }
  }, [intervalMs, router])

  return (
    <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
      <RefreshCw className="h-3 w-3 animate-spin" /> Checking again in {seconds}s
    </p>
  )
}
