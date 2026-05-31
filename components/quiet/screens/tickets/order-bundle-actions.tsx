"use client"

import * as React from "react"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"

// TICK-77 — Client actions for the order-level /o/[token] bundle.
//
// The page is a server component for security (token verify + admin reads);
// these small wrappers add the share/forward affordances that need the
// browser. Each action uses navigator.share when present and falls back to
// the clipboard, mirroring TicketView's behaviour.

function shareOrCopy(url: string, title: string, text: string): Promise<void> {
  const nav = typeof navigator === "undefined" ? null : navigator
  if (nav?.share) {
    return nav.share({ title, text, url }).catch(() => {})
  }
  return nav?.clipboard?.writeText(url).catch(() => {}) ?? Promise.resolve()
}

function useCopyFeedback() {
  const [copied, setCopied] = React.useState(false)
  React.useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 1500)
    return () => window.clearTimeout(t)
  }, [copied])
  return [copied, setCopied] as const
}

export function ShareOrderButton({
  url,
  eventTitle,
  ticketCount,
}: {
  url: string
  eventTitle: string
  ticketCount: number
}) {
  const [copied, setCopied] = useCopyFeedback()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await shareOrCopy(
          url,
          `Tickets: ${eventTitle}`,
          `My ${ticketCount} ${ticketCount === 1 ? "ticket" : "tickets"} for ${eventTitle}`,
        )
        setCopied(true)
      }}
    >
      <Icon name={copied ? "check" : "share"} size={14} />
      {copied ? "Link copied" : "Share order"}
    </Button>
  )
}

export function ForwardTicketButton({
  url,
  eventTitle,
  ticketTypeName,
}: {
  url: string
  eventTitle: string
  ticketTypeName: string
}) {
  const [copied, setCopied] = useCopyFeedback()
  return (
    <Button
      variant="ghost"
      size="xs"
      aria-label={`Forward ${ticketTypeName} ticket`}
      onClick={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        await shareOrCopy(
          url,
          `Ticket: ${eventTitle}`,
          `Your ${ticketTypeName} ticket for ${eventTitle}`,
        )
        setCopied(true)
      }}
    >
      <Icon name={copied ? "check" : "share"} size={13} />
      {copied ? "Copied" : "Forward"}
    </Button>
  )
}
