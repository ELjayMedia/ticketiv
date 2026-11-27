"use client"

import { useState } from "react"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

/**
 * "Share the event" next step on the order confirmation. Works for guests:
 * it only shares the public event link (native share sheet, falling back to
 * copying the link) — no sign-in, unlike /friends.
 */
export function ShareEventCard({ eventSlug, eventTitle }: { eventSlug: string; eventTitle: string }) {
  const [message, setMessage] = useState<string | null>(null)

  async function share() {
    const url = `${window.location.origin}/events/${encodeURIComponent(eventSlug)}`
    const text = `I'm going to ${eventTitle}. Get your ticket on Ticketiv.`
    try {
      if (navigator.share) {
        await navigator.share({ title: eventTitle, text, url })
        return
      }
      await navigator.clipboard?.writeText(url)
      setMessage("Event link copied.")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setMessage("Could not open sharing. Copy the event link from your browser instead.")
    }
  }

  return (
    <button type="button" onClick={() => void share()} className="block w-full text-left">
      <Card className="flex items-center gap-3 p-3" flat>
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon name="share" size={16} />
        </div>
        <div className="flex flex-1 flex-col">
          <span className="text-[13px] font-semibold">Share the event</span>
          <span className="font-mono text-[11px] text-ink-3" aria-live="polite">
            {message ?? "Send the event link to friends"}
          </span>
        </div>
        <Icon name="chevR" size={16} className="text-ink-3" />
      </Card>
    </button>
  )
}
