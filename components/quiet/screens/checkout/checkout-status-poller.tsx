"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

interface CheckoutStatusPollerProps {
  /** Poll only while a payment is pending confirmation. */
  active: boolean
  intervalMs?: number
  /** Stop after this many refreshes so an abandoned tab doesn't poll forever. */
  maxPolls?: number
}

/**
 * Refreshes the server component on an interval so a resale/waitlist checkout
 * return page reflects the provider webhook marking the payment succeeded (and
 * the transfer/issue completing) without the buyer reloading manually.
 */
export function CheckoutStatusPoller({ active, intervalMs = 4000, maxPolls = 30 }: CheckoutStatusPollerProps) {
  const router = useRouter()

  React.useEffect(() => {
    if (!active) return
    let polls = 0
    const id = setInterval(() => {
      polls += 1
      if (polls > maxPolls) {
        clearInterval(id)
        return
      }
      router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [active, intervalMs, maxPolls, router])

  return null
}
