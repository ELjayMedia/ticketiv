"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "@/components/quiet/ui/icon"
import { duplicateEvent } from "../actions"
import posthog from "posthog-js"

interface DuplicateEventButtonProps {
  orgId: string
  eventId: string
  /** When true renders as a full-width menu row; otherwise an icon button */
  asMenuItem?: boolean
}

export function DuplicateEventButton({ orgId, eventId, asMenuItem }: DuplicateEventButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setLoading(true)
    try {
      const result = await duplicateEvent(orgId, eventId)
      if (!result.ok || !result.newEventId) {
        alert(result.error ?? "Failed to duplicate event.")
        return
      }
      posthog.capture("event_duplicated", { organization_id: orgId, source_event_id: eventId })
      router.push(`/orgs/${orgId}/events/${result.newEventId}/edit`)
    } finally {
      setLoading(false)
    }
  }

  if (asMenuItem) {
    return (
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={loading}
        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-bg disabled:opacity-50"
      >
        <Icon name="copy" size={14} className="text-ink-3" />
        {loading ? "Duplicating…" : "Duplicate event"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleDuplicate}
      disabled={loading}
      aria-label="Duplicate event"
      title="Duplicate event"
      className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-bg disabled:opacity-50"
    >
      <Icon name="copy" size={13} />
      {loading ? "Duplicating…" : "Duplicate"}
    </button>
  )
}
