"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  getEventSocialContextAction,
  inviteFriendsToEventAction,
  type EventInviteCandidate,
} from "@/app/(focused)/events/[id]/social-actions"
import { Avatar, AvatarStack } from "@/components/quiet/ui/primitives"
import { Button } from "@/components/quiet/ui/button"
import { Card } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"

export function EventSocialStrip({
  eventId,
  eventSlug,
  eventTitle,
}: {
  eventId: string
  eventSlug: string
  eventTitle: string
}) {
  const router = useRouter()
  const [signedIn, setSignedIn] = React.useState<boolean | null>(null)
  const [candidates, setCandidates] = React.useState<EventInviteCandidate[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    let active = true
    getEventSocialContextAction(eventId).then((result) => {
      if (!active) return
      setSignedIn(result.signedIn)
      if (result.ok) setCandidates(result.candidates)
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [eventId])

  const going = candidates.filter((candidate) => candidate.isGoing)

  function openInvite() {
    if (signedIn === false) {
      router.push(`/login?from=${encodeURIComponent(`/events/${eventSlug}`)}`)
      return
    }
    setOpen(true)
  }

  if (loading) return null

  return (
    <>
      <div className="border-b border-line bg-surface/95 px-5 py-2.5 md:px-10">
        <div className="mx-auto flex max-w-[1280px] items-center gap-3">
          {going.length > 0 ? (
            <AvatarStack>
              {going.slice(0, 4).map((friend) => (
                <Avatar
                  key={friend.handle}
                  src={friend.avatarUrl ?? ""}
                  label={initials(friend.displayName)}
                  size={28}
                />
              ))}
            </AvatarStack>
          ) : (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="users" size={15} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            {going.length > 0 ? (
              <>
                <div className="truncate text-[12px] font-semibold">
                  {going.slice(0, 2).map((friend) => friend.displayName).join(", ")}
                  {going.length > 2 ? ` + ${going.length - 2}` : ""}
                </div>
                <div className="font-mono text-[10px] text-ink-3">
                  {going.length} friend{going.length === 1 ? "" : "s"} going
                </div>
              </>
            ) : (
              <>
                <div className="text-[12px] font-semibold">Make this one social</div>
                <div className="font-mono text-[10px] text-ink-3">
                  Invite friends without sharing ticket or payment details.
                </div>
              </>
            )}
          </div>

          <Button type="button" variant="default" size="xs" onClick={openInvite}>
            <Icon name="share" size={12} /> Invite
          </Button>
        </div>
      </div>

      {open ? (
        <EventInviteDialog
          eventId={eventId}
          eventSlug={eventSlug}
          eventTitle={eventTitle}
          candidates={candidates}
          onCandidatesChange={setCandidates}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function EventInviteDialog({
  eventId,
  eventSlug,
  eventTitle,
  candidates,
  onCandidatesChange,
  onClose,
}: {
  eventId: string
  eventSlug: string
  eventTitle: string
  candidates: EventInviteCandidate[]
  onCandidatesChange: React.Dispatch<React.SetStateAction<EventInviteCandidate[]>>
  onClose: () => void
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [message, setMessage] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [onClose])

  function toggle(handle: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(handle)) next.delete(handle)
      else next.add(handle)
      return next
    })
  }

  function send() {
    const handles = Array.from(selected)
    if (handles.length === 0) return
    setMessage(null)
    startTransition(async () => {
      const result = await inviteFriendsToEventAction(eventId, handles)
      if (!result.ok) {
        setMessage(result.error ?? "Could not send invitations.")
        return
      }

      const sent = new Set(result.invitedHandles)
      onCandidatesChange((current) =>
        current.map((candidate) =>
          sent.has(candidate.handle)
            ? { ...candidate, inviteStatus: "pending" }
            : candidate,
        ),
      )
      setSelected(new Set())
      setMessage(
        result.invitedHandles.length > 0
          ? `Sent ${result.invitedHandles.length} invitation${result.invitedHandles.length === 1 ? "" : "s"}.`
          : "No eligible invitations were sent.",
      )
    })
  }

  async function shareEvent() {
    const url = `${window.location.origin}/events/${encodeURIComponent(eventSlug)}`
    const text = `Join me at ${eventTitle} on Ticketiv.`
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

  const selectable = candidates.filter(
    (candidate) => !candidate.isGoing && candidate.inviteStatus !== "pending",
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Invite friends to ${eventTitle}`}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 p-0 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[82dvh] w-full max-w-[520px] overflow-hidden rounded-t-[var(--radius-lg)] bg-surface shadow-[var(--shadow-elev)] md:rounded-[var(--radius-lg)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="text-label">Invite friends</div>
            <h2 className="mt-0.5 truncate text-[17px] font-semibold">{eventTitle}</h2>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-ink-3">
              An invitation is not a ticket or RSVP. Friends appear as going only after they have a paid ticket and their privacy allows it.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-bg"
            onClick={onClose}
          >
            <Icon name="close" size={15} />
          </button>
        </div>

        <div className="max-h-[52dvh] overflow-y-auto px-5 py-3">
          {candidates.length === 0 ? (
            <Card className="border-dashed p-5 text-center">
              <div className="text-[13px] font-semibold">No Ticketiv friends to invite yet</div>
              <p className="mt-1 font-mono text-[10px] text-ink-3">
                You can still share this event with someone outside Ticketiv.
              </p>
            </Card>
          ) : (
            <ul className="divide-y divide-line">
              {candidates.map((candidate) => {
                const alreadyInvited = candidate.inviteStatus === "pending"
                const disabled = candidate.isGoing || alreadyInvited
                const checked = selected.has(candidate.handle)
                return (
                  <li key={candidate.handle} className="flex items-center gap-3 py-3">
                    <Avatar
                      src={candidate.avatarUrl ?? ""}
                      label={initials(candidate.displayName)}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{candidate.displayName}</div>
                      <div className="truncate font-mono text-[10px] text-ink-3">
                        @{candidate.handle}
                        {candidate.isGoing ? " · already going" : alreadyInvited ? " · invited" : ""}
                      </div>
                    </div>
                    {disabled ? (
                      <span className="font-mono text-[10px] font-semibold text-ink-3">
                        {candidate.isGoing ? "Going" : "Invited"}
                      </span>
                    ) : (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(candidate.handle)}
                        aria-label={`Invite ${candidate.displayName}`}
                        className="h-5 w-5 accent-current"
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-line px-5 py-4">
          {message ? (
            <p role="status" className="mb-2 font-mono text-[10px] text-ink-3">
              {message}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="button" variant="default" size="md" onClick={() => void shareEvent()}>
              <Icon name="share" size={13} /> Share event
            </Button>
            <Button
              type="button"
              variant="accent"
              size="md"
              className="flex-1"
              disabled={pending || selected.size === 0 || selectable.length === 0}
              onClick={send}
            >
              {pending ? "Sending…" : `Invite selected${selected.size > 0 ? ` · ${selected.size}` : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? "?"}${parts[1]?.[0] ?? ""}`
}
