"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/quiet/ui/icon"
import posthog from "posthog-js"

export function ToggleSalesStatusButton({
  eventId,
  ticketTypeId,
  currentStatus,
}: {
  eventId: string
  ticketTypeId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isOnSale = currentStatus === "on_sale"
  const canToggle = currentStatus === "on_sale" || currentStatus === "paused"

  if (!canToggle) return null

  async function handleToggle() {
    const next = isOnSale ? "paused" : "on_sale"
    const label = isOnSale ? "pause sales for this ticket type" : "resume sales for this ticket type"
    if (!confirm(`Are you sure you want to ${label}?`)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/tickets/${ticketTypeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_status: next }),
      })
      if (res.ok) {
        posthog.capture("ticket_type_sales_status_changed", { event_id: eventId, ticket_type_id: ticketTypeId, status: next })
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? "Failed to update ticket status.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      aria-label={isOnSale ? "Pause sales" : "Resume sales"}
      title={isOnSale ? "Pause sales" : "Resume sales"}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink disabled:opacity-50"
    >
      <Icon name={isOnSale ? "minus" : "zap"} size={14} />
    </button>
  )
}
