"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/quiet/ui/icon"
import posthog from "posthog-js"

export function DeleteTicketTypeButton({
  eventId,
  ticketTypeId,
}: {
  eventId: string
  ticketTypeId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Delete this ticket type? This cannot be undone.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/events/${eventId}/tickets/${ticketTypeId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        posthog.capture("ticket_type_deleted", { event_id: eventId, ticket_type_id: ticketTypeId })
        router.refresh()
      } else {
        const body = await res.json().catch(() => ({}))
        alert(body.error ?? "Failed to delete ticket type.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      aria-label="Delete ticket type"
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-danger transition-colors hover:bg-danger-soft disabled:opacity-50"
    >
      <Icon name="trash" size={14} />
    </button>
  )
}
