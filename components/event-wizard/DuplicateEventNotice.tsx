"use client"

import * as React from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import {
  AUTO_FORWARD_HOURS,
  DUPLICATE_REASONS,
  autoForwardAt,
  duplicateReasons,
  timeLeftLabel,
  type DuplicateMatch,
  type DuplicateRequestReason,
} from "@/lib/events/duplicates-core"

/**
 * Top of the event form: if this event matches another organiser's published
 * event it can't be published. Explain why, and give a shortcut to message
 * Ticketiv support (to ask for permission or explain). Support passes it to
 * the other organiser, or it goes there by itself after 3 hours.
 */

function formatWhen(iso: string | null, tz: string | null) {
  if (!iso) return null
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: tz || "Africa/Mbabane",
    }).format(new Date(iso))
  } catch {
    return new Date(iso).toDateString()
  }
}

function joinReasons(reasons: string[]) {
  if (reasons.length <= 1) return reasons[0] ?? "the same details"
  return `${reasons.slice(0, -1).join(", ")} and ${reasons[reasons.length - 1]}`
}

function RequestForm({
  eventId,
  match,
  onSent,
  onCancel,
}: {
  eventId: string
  match: DuplicateMatch
  onSent: () => void
  onCancel: () => void
}) {
  const [reason, setReason] = React.useState<DuplicateRequestReason>("permission")
  const [message, setMessage] = React.useState("")
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const placeholder =
    reason === "permission"
      ? `e.g. We're co-promoting with ${match.orgName} and sell a share of the tickets. Contact: …`
      : reason === "mine_is_original"
        ? "e.g. We're the real organiser. The other listing uses our poster. You can confirm with the venue on …"
        : reason === "different_event"
          ? "e.g. It's a separate show in the small room, starting after theirs ends."
          : "Tell support what's going on."

  async function send() {
    setSending(true)
    setError(null)
    try {
      const response = await fetch(`/api/events/${eventId}/duplicates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalEventId: match.eventId, reason, message }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Couldn't send your message.")
      onSent()
    } catch (err: any) {
      setError(err?.message || "Couldn't send your message.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-[var(--radius)] border border-line bg-surface p-3">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1 text-[13px] font-semibold">What&apos;s going on?</legend>
        {DUPLICATE_REASONS.map((r) => (
          <label key={r.value} className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-[var(--radius)] px-2 py-1.5 hover:bg-bg">
            <input
              type="radio"
              name={`dup-reason-${match.eventId}`}
              className="mt-1 accent-[var(--color-accent)]"
              checked={reason === r.value}
              onChange={() => setReason(r.value)}
            />
            <span className="flex flex-col">
              <span className="text-[13px] font-medium">{r.label}</span>
              <span className="text-[12px] text-ink-3">{r.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold">Message to support</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          rows={4}
          maxLength={2000}
          className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        />
      </label>
      <p className="text-[12px] leading-relaxed text-ink-3">
        Support replies within {AUTO_FORWARD_HOURS} hours. If they haven&apos;t by then, your message goes to {match.orgName} automatically
        so they can approve it. They&apos;ll see your organisation&apos;s name and this message.
      </p>
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="accent" size="sm" onClick={send} disabled={sending || message.trim().length < 10}>
          {sending ? "Sending…" : "Send to support"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function MatchCard({ eventId, match, now, onChanged }: { eventId: string; match: DuplicateMatch; now: Date; onChanged: () => void }) {
  const [writing, setWriting] = React.useState(false)
  const [withdrawing, setWithdrawing] = React.useState(false)
  const when = formatWhen(match.startsAt, match.tz)
  const request = match.request
  const open = request && (request.status === "with_support" || request.status === "with_organiser")

  async function withdraw() {
    if (!request) return
    setWithdrawing(true)
    await fetch(`/api/events/${eventId}/duplicates?requestId=${request.id}`, { method: "DELETE" }).catch(() => null)
    setWithdrawing(false)
    onChanged()
  }

  return (
    <li className="flex flex-col gap-1.5 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[14px] font-semibold">
          {match.title} <span className="font-normal text-ink-3">by {match.orgName}</span>
        </span>
        {match.slug ? (
          <Link href={`/events/${match.slug}`} target="_blank" className="text-[12px] font-semibold text-accent hover:underline">
            View their event
          </Link>
        ) : null}
      </div>
      <span className="font-mono text-[11px] text-ink-3">
        {[when, match.venueName].filter(Boolean).join(" · ")}
      </span>
      <span className="text-[13px] text-ink-2">Same day, with {joinReasons(duplicateReasons(match))}.</span>

      {request?.status === "with_support" ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] bg-surface px-3 py-2">
          <span className="text-[12px] text-ink-2">
            <strong className="font-semibold">Sent to Ticketiv support.</strong> If they haven&apos;t replied in{" "}
            {timeLeftLabel(autoForwardAt(request.createdAt), now)}, it goes to {match.orgName} automatically.
          </span>
          <Button variant="ghost" size="xs" onClick={withdraw} disabled={withdrawing}>
            Withdraw
          </Button>
        </div>
      ) : request?.status === "with_organiser" ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] bg-surface px-3 py-2">
          <span className="text-[12px] text-ink-2">
            <strong className="font-semibold">Waiting for {match.orgName}.</strong>{" "}
            {request.forwardedBy === "auto" ? "Support didn't reply in time, so your message went to them directly." : "Support passed your message to them."}{" "}
            We&apos;ll tell you when they answer.
          </span>
          <Button variant="ghost" size="xs" onClick={withdraw} disabled={withdrawing}>
            Withdraw
          </Button>
        </div>
      ) : request?.status === "declined" ? (
        <div className="mt-1 rounded-[var(--radius)] bg-danger-soft px-3 py-2 text-[12px] text-ink-2">
          <strong className="font-semibold text-danger">Request declined.</strong>
          {request.decisionNote ? ` "${request.decisionNote}"` : ""} You can change your event&apos;s details or send support more information.
        </div>
      ) : null}

      {!open ? (
        writing ? (
          <RequestForm
            eventId={eventId}
            match={match}
            onCancel={() => setWriting(false)}
            onSent={() => {
              setWriting(false)
              onChanged()
            }}
          />
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setWriting(true)} className="gap-1.5">
              <Icon name="bell" size={13} /> {request?.status === "declined" ? "Send support more information" : "Message support / ask permission"}
            </Button>
          </div>
        )
      ) : null}
    </li>
  )
}

export function DuplicateEventNotice({ eventId, refreshKey }: { eventId: string; refreshKey: number }) {
  const [matches, setMatches] = React.useState<DuplicateMatch[] | null>(null)
  const [reload, setReload] = React.useState(0)
  const [now, setNow] = React.useState(() => new Date())

  React.useEffect(() => {
    let cancelled = false
    fetch(`/api/events/${eventId}/duplicates`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!cancelled && payload) {
          setMatches(Array.isArray(payload.matches) ? payload.matches : [])
          setNow(new Date())
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [eventId, refreshKey, reload])

  if (!matches) return null
  const blocking = matches.filter((m) => m.blocking && !m.approved)
  const approved = matches.filter((m) => m.approved)
  if (blocking.length === 0 && approved.length === 0) return null

  return (
    <div className="mb-5 flex flex-col gap-3">
      {blocking.length > 0 ? (
        <section role="alert" className="overflow-hidden rounded-[var(--radius-lg)] border border-warning/30 bg-warning-soft">
          <div className="flex items-start gap-2.5 px-4 pt-3.5">
            <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <h2 className="text-[15px] font-semibold text-ink">This looks like an event that&apos;s already on Ticketiv</h2>
              <p className="text-[13px] leading-relaxed text-ink-2">
                To protect buyers from fake listings, an event that matches another organiser&apos;s published event can&apos;t be published.
                If it&apos;s a different event, change its name, date or venue. If you&apos;re working with them, or the other listing isn&apos;t
                genuine, message support.
              </p>
            </div>
          </div>
          <ul className="mt-2 flex flex-col divide-y divide-warning/20 border-t border-warning/20">
            {blocking.map((match) => (
              <MatchCard key={match.eventId} eventId={eventId} match={match} now={now} onChanged={() => setReload((n) => n + 1)} />
            ))}
          </ul>
        </section>
      ) : null}
      {approved.map((match) => (
        <p key={match.eventId} className="flex items-start gap-2 rounded-[var(--radius)] bg-success-soft px-3 py-2 text-[13px] text-ink-2">
          <Icon name="checkCircle" size={15} className="mt-0.5 shrink-0 text-success" />
          <span>
            Approved to run alongside <strong className="font-semibold">{match.title}</strong> by {match.orgName}.
          </span>
        </p>
      ))}
    </div>
  )
}
