"use client"

import { useState } from "react"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalFooter,
  ModalClose,
} from "@/components/quiet/ui/modal"
import { transitionEventStatus } from "../../actions"

interface EventStatusControlsProps {
  orgId: string
  eventId: string
  status: string
  issuedTickets: number
  onSuccess: () => void
}

export function EventStatusControls({
  orgId,
  eventId,
  status,
  issuedTickets,
  onSuccess,
}: EventStatusControlsProps) {
  const [pauseOpen, setPauseOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleTransition(newStatus: "paused" | "published" | "archived") {
    setLoading(true)
    setError("")
    try {
      const result = await transitionEventStatus(orgId, eventId, newStatus)
      if (!result.ok) {
        setError(result.error ?? "Failed to update status")
        return
      }
      setPauseOpen(false)
      setArchiveOpen(false)
      onSuccess()
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Pause sales — published only */}
      {status === "published" && (
        <Modal open={pauseOpen} onOpenChange={setPauseOpen}>
          <ModalTrigger asChild>
            <Button variant="outline" size="md">
              <Icon name="clock" size={14} />
              Pause sales
            </Button>
          </ModalTrigger>
          <ModalContent title="Pause ticket sales" size="sm">
            <p className="text-[14px] text-ink-2">
              Ticket purchases will be blocked while the event is paused. You can resume sales at any
              time from this page.
            </p>
            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost" size="md" disabled={loading}>
                  Cancel
                </Button>
              </ModalClose>
              <Button
                variant="default"
                size="md"
                disabled={loading}
                onClick={() => handleTransition("paused")}
              >
                {loading ? "Pausing…" : "Pause sales"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Resume sales — paused only */}
      {status === "paused" && (
        <Button
          variant="outline"
          size="md"
          disabled={loading}
          onClick={() => handleTransition("published")}
        >
          <Icon name="check" size={14} />
          {loading ? "Resuming…" : "Resume sales"}
        </Button>
      )}

      {/* Archive — any non-archived status */}
      {status !== "archived" && (
        <Modal open={archiveOpen} onOpenChange={setArchiveOpen}>
          <ModalTrigger asChild>
            <Button variant="ghost" size="md" className="text-danger hover:bg-danger-soft">
              <Icon name="trash" size={14} />
              Archive
            </Button>
          </ModalTrigger>
          <ModalContent title="Archive event" size="sm">
            <p className="text-[14px] text-ink-2">
              Archiving hides the event from your active list and stops all ticket sales. This action
              is difficult to reverse.
            </p>
            {issuedTickets > 0 && (
              <div className="mt-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 p-3">
                <p className="text-[13px] text-warning">
                  <strong>{issuedTickets.toLocaleString()}</strong> active ticket holder
                  {issuedTickets !== 1 ? "s" : ""} will retain their tickets, but no new purchases
                  will be possible.
                </p>
              </div>
            )}
            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
            <ModalFooter>
              <ModalClose asChild>
                <Button variant="ghost" size="md" disabled={loading}>
                  Cancel
                </Button>
              </ModalClose>
              <Button
                variant="primary"
                size="md"
                disabled={loading}
                className="bg-danger border-danger hover:bg-danger/90"
                onClick={() => handleTransition("archived")}
              >
                {loading ? "Archiving…" : "Archive event"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}
