"use client"

import { useState, useTransition } from "react"
import Link from "next/link"

import { updateSocialPrivacyAction } from "@/app/(consumer)/friends/actions"
import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import type { SocialPrivacySettings } from "@/lib/data/attendee/social-privacy"

export function FriendsSettingsScreen({ settings }: { settings: SocialPrivacySettings }) {
  const [prefs, setPrefs] = useState(settings)
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function save() {
    setMessage(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateSocialPrivacyAction(prefs)
      if (!result.ok) {
        setMessage(result.error ?? "Could not save social privacy settings.")
        return
      }
      setSaved(true)
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 pb-24 pt-20">
      <header className="flex items-start gap-3">
        <Link
          href="/friends"
          aria-label="Back to friends"
          className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface"
        >
          <Icon name="chevL" size={18} />
        </Link>
        <div className="flex flex-col gap-1">
          <span className="text-label">Friends</span>
          <h1 className="text-h1">Social privacy</h1>
          <p className="text-[13px] leading-relaxed text-ink-3">
            Choose how people can find you and what your friends can see. Ticket purchases and payment details are never shared here.
          </p>
        </div>
      </header>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-semibold">Profile discoverability</span>
          <span className="font-mono text-[10px] leading-relaxed text-ink-3">
            Everyone lets signed-out visitors and Ticketiv users open your public profile. Friends limits your profile to people already in your circle.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 rounded-[var(--radius)] bg-bg p-1">
          {(["everyone", "friends"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={prefs.profileDiscoverability === value}
              onClick={() => setPrefs((current) => ({ ...current, profileDiscoverability: value }))}
              className={
                "rounded-[var(--radius)] px-3 py-2 text-[12px] font-semibold transition-colors " +
                (prefs.profileDiscoverability === value
                  ? "bg-ink text-surface"
                  : "text-ink-3 hover:bg-surface")
              }
            >
              {value === "everyone" ? "Everyone" : "Friends only"}
            </button>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <PrivacyToggle
          label="Friend requests"
          description="Allow eligible Ticketiv users to send you a friend request."
          checked={prefs.allowFriendRequests}
          onChange={() => setPrefs((current) => ({ ...current, allowFriendRequests: !current.allowFriendRequests }))}
        />
        <PrivacyToggle
          label="Show events I'm going to"
          description="Friends can see a simple going-to signal. Ticket type, seat, order value and payment information stay private."
          checked={prefs.showEventsGoingToFriends}
          onChange={() => setPrefs((current) => ({ ...current, showEventsGoingToFriends: !current.showEventsGoingToFriends }))}
        />
        <PrivacyToggle
          label="Friend suggestions"
          description="Allow Ticketiv to use safe social signals for people-you-may-know suggestions."
          checked={prefs.allowFriendSuggestions}
          onChange={() => setPrefs((current) => ({ ...current, allowFriendSuggestions: !current.allowFriendSuggestions }))}
        />
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className={`font-mono text-[10px] ${message ? "text-danger" : "text-accent"}`} role="status">
          {message ?? (saved ? "Social privacy saved." : "")}
        </p>
        <Button type="button" variant="primary" size="md" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save privacy"}
        </Button>
      </div>
    </main>
  )
}

function PrivacyToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-3.5 py-3">
      <span className="flex flex-col gap-0.5">
        <span className="text-[14px] font-medium text-ink">{label}</span>
        <span className="font-mono text-[10px] leading-relaxed text-ink-3">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={`Toggle ${label}`}
        className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-2 transition-colors checked:bg-accent before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-surface before:transition-transform checked:before:translate-x-[18px]"
      />
    </label>
  )
}
