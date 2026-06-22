"use client"

import * as React from "react"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { Modal, ModalContent, ModalClose, ModalFooter } from "@/components/quiet/ui/modal"
import {
  previewAttendeeAudienceAction,
  emailAttendeesAction,
  type EmailAudience,
  type EmailAttendeesResult,
} from "./email-attendees-actions"

export interface AudienceTicketType {
  id: string
  name: string
}

interface Props {
  orgId: string
  eventId: string
  ticketTypes: AudienceTicketType[]
}

type AudienceOption = { value: EmailAudience; label: string }

export function EmailAttendeesButton({ orgId, eventId, ticketTypes }: Props) {
  const [open, setOpen] = React.useState(false)
  const [audience, setAudience] = React.useState<EmailAudience>("all")
  const [subject, setSubject] = React.useState("")
  const [body, setBody] = React.useState("")

  const [count, setCount] = React.useState<number | null>(null)
  const [sample, setSample] = React.useState<string[]>([])
  const [previewLoading, setPreviewLoading] = React.useState(false)
  const [previewError, setPreviewError] = React.useState<string | null>(null)

  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<EmailAttendeesResult | null>(null)

  const audienceOptions: AudienceOption[] = React.useMemo(() => {
    const base: AudienceOption[] = [
      { value: "all", label: "All attendees" },
      { value: "checked_in", label: "Checked-in only" },
      { value: "not_checked_in", label: "Not yet checked in" },
    ]
    const byType: AudienceOption[] = ticketTypes.map((tt) => ({
      value: tt.id,
      label: `Ticket type: ${tt.name}`,
    }))
    return [...base, ...byType]
  }, [ticketTypes])

  function resetForm() {
    setAudience("all")
    setSubject("")
    setBody("")
    setCount(null)
    setSample([])
    setPreviewError(null)
    setError(null)
    setResult(null)
  }

  // Refresh the recipient count + preview whenever audience changes (or modal opens).
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    setPreviewLoading(true)
    setPreviewError(null)
    previewAttendeeAudienceAction(orgId, eventId, audience)
      .then((preview) => {
        if (cancelled) return
        if (preview.error) {
          setPreviewError(preview.error)
          setCount(null)
          setSample([])
        } else {
          setCount(preview.count)
          setSample(preview.sample)
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, audience, orgId, eventId])

  const canSend =
    !sending && subject.trim().length > 0 && body.trim().length > 0 && (count ?? 0) > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSend) return
    setSending(true)
    setError(null)
    const res = await emailAttendeesAction(orgId, eventId, audience, subject, body)
    setSending(false)
    if (res.error) {
      setError(res.error)
    } else {
      setResult(res)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          resetForm()
          setOpen(true)
        }}
      >
        <Icon name="bell" size={14} />
        Email attendees
      </Button>

      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) resetForm()
        }}
      >
        <ModalContent title="Email attendees" size="lg">
          {result ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Icon name="check" size={28} className="text-accent" />
              <p className="text-[15px] font-semibold text-ink">
                {result.sentCount > 0
                  ? `Sent to ${result.sentCount.toLocaleString()} ${result.sentCount === 1 ? "person" : "people"}`
                  : "Broadcast recorded"}
              </p>
              <p className="text-[13px] text-ink-3">
                {result.sentCount > 0
                  ? `${result.recipientCount.toLocaleString()} recipient${result.recipientCount === 1 ? "" : "s"} in the selected audience.`
                  : "Email delivery is not configured in this environment, so no messages were dispatched. The broadcast was logged."}
                {result.failedCount > 0
                  ? ` ${result.failedCount.toLocaleString()} failed.`
                  : ""}
              </p>
              <ModalFooter className="-mx-5 -mb-5 mt-2 w-[calc(100%+2.5rem)] justify-center">
                <ModalClose asChild>
                  <Button variant="primary" size="sm" type="button">
                    Done
                  </Button>
                </ModalClose>
              </ModalFooter>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Audience */}
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Audience</label>
                <select
                  value={String(audience)}
                  onChange={(e) => setAudience(e.target.value)}
                  className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                >
                  {audienceOptions.map((opt) => (
                    <option key={String(opt.value)} value={String(opt.value)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  {previewLoading
                    ? "Counting recipients…"
                    : previewError
                      ? previewError
                      : `Send to ${(count ?? 0).toLocaleString()} ${count === 1 ? "person" : "people"}`}
                </p>
              </div>

              {/* Recipient preview (first 5) */}
              {!previewLoading && !previewError && sample.length > 0 && (
                <div className="flex flex-col gap-1 rounded-[var(--radius)] border border-line bg-bg px-3 py-2.5">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    Preview — first {sample.length} of {(count ?? 0).toLocaleString()}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {sample.map((email) => (
                      <li key={email} className="truncate text-[12px] text-ink-2">
                        {email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Subject</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Important update about the event"
                  className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                />
              </div>

              {/* Body */}
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Message</label>
                <textarea
                  required
                  maxLength={10000}
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message to attendees…"
                  className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                />
                <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                  Max 1 broadcast per event per hour
                </p>
              </div>

              {error && (
                <p className="rounded-[var(--radius)] bg-danger-soft px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              )}

              <ModalFooter className="-mx-5 -mb-5 mt-0 w-[calc(100%+2.5rem)]">
                <ModalClose asChild>
                  <Button variant="outline" size="sm" type="button">
                    Cancel
                  </Button>
                </ModalClose>
                <Button variant="primary" size="sm" type="submit" disabled={!canSend}>
                  {sending
                    ? "Sending…"
                    : `Send to ${(count ?? 0).toLocaleString()} ${count === 1 ? "person" : "people"}`}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
