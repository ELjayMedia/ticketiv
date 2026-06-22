"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { Modal, ModalContent, ModalClose, ModalFooter } from "@/components/quiet/ui/modal"
import { issueCompTicket } from "./actions"

export interface TicketTypeOption {
  id: string
  name: string
  price_cents: number
}

interface Props {
  orgId: string
  eventId: string
  ticketTypes: TicketTypeOption[]
}

export function CompTicketButton({ orgId, eventId, ticketTypes }: Props) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [recipientEmail, setRecipientEmail] = React.useState("")
  const [ticketTypeId, setTicketTypeId] = React.useState(ticketTypes[0]?.id ?? "")
  const [qty, setQty] = React.useState(1)
  const [note, setNote] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  function resetForm() {
    setRecipientEmail("")
    setTicketTypeId(ticketTypes[0]?.id ?? "")
    setQty(1)
    setNote("")
    setError(null)
    setSuccess(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!recipientEmail || !ticketTypeId) return
    setLoading(true)
    setError(null)
    const result = await issueCompTicket(
      orgId,
      eventId,
      ticketTypeId,
      recipientEmail,
      qty,
      note,
    )
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      router.refresh()
      setTimeout(() => {
        setOpen(false)
        resetForm()
      }, 1500)
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
        <Icon name="ticket" size={14} />
        Issue comp ticket
      </Button>

      <Modal open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
        <ModalContent title="Issue complimentary ticket" size="md">
          {success ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Icon name="check" size={28} className="text-success" />
              <p className="text-[15px] font-semibold text-ink">Comp ticket issued!</p>
              <p className="text-[13px] text-ink-3">
                The ticket has been created and the recipient will receive a confirmation.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-label">Recipient email</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="attendee@example.com"
                  className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label">Ticket type</label>
                <select
                  required
                  value={ticketTypeId}
                  onChange={(e) => setTicketTypeId(e.target.value)}
                  className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                >
                  {ticketTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}{" "}
                      {tt.price_cents > 0
                        ? `(SZL ${(tt.price_cents / 100).toFixed(2)} face value)`
                        : "(Free)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label">Quantity</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-24 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-label">Internal note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. VIP guest, speaker comp, press…"
                  rows={2}
                  className="rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-2 text-[13px] text-ink outline-none transition focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
                />
              </div>

              {error && (
                <p className="rounded-[var(--radius)] bg-danger-soft px-3 py-2 text-[13px] text-danger">
                  {error}
                </p>
              )}

              <ModalFooter className="-mx-5 -mb-5 mt-0">
                <ModalClose asChild>
                  <Button variant="outline" size="sm" type="button">
                    Cancel
                  </Button>
                </ModalClose>
                <Button variant="primary" size="sm" type="submit" disabled={loading}>
                  {loading ? "Issuing…" : `Issue ${qty > 1 ? `${qty} ` : ""}comp ticket${qty > 1 ? "s" : ""}`}
                </Button>
              </ModalFooter>
            </form>
          )}
        </ModalContent>
      </Modal>
    </>
  )
}
