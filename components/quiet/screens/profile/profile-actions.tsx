"use client"

import { useCallback, useState } from "react"
import { Icon, type IconName } from "@/components/quiet/ui/icon"

/** Shared share/invite behaviour: Web Share API with clipboard fallback. */
function useShare(handle?: string | null, name?: string) {
  const [copied, setCopied] = useState(false)

  const share = useCallback(async () => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://ticketiv.app"
    const url = handle ? `${origin}/?ref=${encodeURIComponent(handle)}` : origin
    const text = name
      ? `${name} is on Ticketiv — discover and book events together.`
      : "Discover and book events on Ticketiv."

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "Ticketiv", text, url })
        return
      }
    } catch {
      // user dismissed the share sheet — fall through to copy
    }

    try {
      await navigator.clipboard.writeText(`${text} ${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — nothing else we can do gracefully
    }
  }, [handle, name])

  return { copied, share }
}

/** Icon-only share control (profile header). */
export function ShareButton({
  handle,
  name,
  className,
  iconSize = 20,
  label,
}: {
  handle?: string | null
  name?: string
  className?: string
  iconSize?: number
  label: string
}) {
  const { copied, share } = useShare(handle, name)
  return (
    <button type="button" onClick={share} className={className} aria-label={label}>
      <Icon name={copied ? "check" : "share"} size={iconSize} />
    </button>
  )
}

/** Invite entry styled to match a (non-plain) SettingsList row in ProfileScreen. */
export function ShareRow({
  handle,
  name,
  label = "Invite friends",
  description,
}: {
  handle?: string | null
  name?: string
  label?: string
  description?: string
}) {
  const { copied, share } = useShare(handle, name)
  const icon: IconName = copied ? "check" : "share"
  return (
    <button
      type="button"
      onClick={share}
      className="flex w-full items-center gap-2.5 border-b border-line px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-bg"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name={icon} size={14} />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[14px] font-medium">{copied ? "Invite link copied" : label}</span>
        {description && (
          <span className="font-mono text-[10px] leading-relaxed text-ink-3">{description}</span>
        )}
      </span>
      <Icon name="chevR" size={14} className="text-ink-3" />
    </button>
  )
}
