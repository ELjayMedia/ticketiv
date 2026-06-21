"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { Button } from "@/components/quiet/ui/button"
import { EmptyState } from "@/components/quiet/ui/empty-state"
import {
  Modal,
  ModalContent,
  ModalClose,
  ModalFooter,
} from "@/components/quiet/ui/modal"
import { bulkCheckIn } from "./actions"

export interface AttendeeRow {
  id: string
  ticket_code: string
  status: string
  holder_name: string | null
  holder_email: string | null
  checked_in_at: string | null
  created_at: string
  ticket_types: { name: string } | null
  orders: { buyer_email: string | null } | null
}

interface Props {
  attendees: AttendeeRow[]
  orgId: string
  eventId: string
  totalCount: number
  filterActive: boolean
  paginator: React.ReactNode
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(d),
  )
}

const ITEM_STATUS_CHIP: Record<string, "active" | "muted" | "default" | "accent"> = {
  issued: "default",
  checked_in: "active",
  transferred: "muted",
  revoked: "muted",
  refunded: "accent",
}

export function AttendeesBulkTable({
  attendees,
  orgId,
  eventId,
  totalCount,
  filterActive,
  paginator,
}: Props) {
  const router = useRouter()
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<string | null>(null)

  const checkable = attendees.filter((a) => a.status === "issued")
  const allCheckableSelected =
    checkable.length > 0 && checkable.every((a) => selected.has(a.id))

  function toggleAll() {
    if (allCheckableSelected) {
      setSelected((prev) => {
        const next = new Set(prev)
        checkable.forEach((a) => next.delete(a.id))
        return next
      })
    } else {
      setSelected((prev) => {
        const next = new Set(prev)
        checkable.forEach((a) => next.add(a.id))
        return next
      })
    }
  }

  function toggleRow(id: string, checkable: boolean) {
    if (!checkable) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirmCheckIn() {
    setLoading(true)
    const result = await bulkCheckIn(orgId, eventId, [...selected])
    setLoading(false)
    setConfirmOpen(false)
    setSelected(new Set())

    if (result.error) {
      setToast(`Error: ${result.error}`)
    } else {
      const msg =
        result.checkedCount === 0
          ? "All selected were already checked in."
          : `Checked in ${result.checkedCount} attendee${result.checkedCount !== 1 ? "s" : ""}${result.skippedCount > 0 ? ` (${result.skippedCount} already checked in, skipped)` : ""}.`
      setToast(msg)
      router.refresh()
    }
    setTimeout(() => setToast(null), 4000)
  }

  const selectedAttendees = attendees.filter((a) => selected.has(a.id))

  return (
    <>
      <Card>
        <CardBody className="flex items-center justify-between px-5 py-4">
          <p className="text-label">
            {filterActive
              ? `Attendees — ${attendees.length.toLocaleString()} of ${totalCount.toLocaleString()}`
              : `Attendees (${totalCount.toLocaleString()})`}
          </p>
          {selected.size > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setConfirmOpen(true)}
            >
              <Icon name="check" size={14} />
              Check in {selected.size} attendee{selected.size !== 1 ? "s" : ""}
            </Button>
          )}
        </CardBody>
        <CardDivider />
        {attendees.length === 0 ? (
          <CardBody className="py-12">
            <EmptyState
              icon="users"
              title={filterActive ? "No attendees match" : "No attendees yet"}
              description={
                filterActive
                  ? "Try adjusting the search or status filter."
                  : "Attendees will appear here once tickets are issued."
              }
              compact
            />
          </CardBody>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allCheckableSelected}
                        onChange={toggleAll}
                        disabled={checkable.length === 0}
                        className="h-4 w-4 cursor-pointer rounded border-line-2 accent-ink"
                        title="Select all checkable on this page"
                      />
                    </th>
                    <th className="px-5 py-3 text-left text-label">Ticket code</th>
                    <th className="px-5 py-3 text-left text-label">Holder</th>
                    <th className="px-5 py-3 text-left text-label">Ticket type</th>
                    <th className="px-5 py-3 text-left text-label">Check-in</th>
                    <th className="px-5 py-3 text-left text-label">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((item, i) => {
                    const isCheckable = item.status === "issued"
                    const isSelected = selected.has(item.id)
                    return (
                      <tr
                        key={item.id}
                        className={[
                          i > 0 ? "border-t border-line" : "",
                          isSelected ? "bg-accent-soft" : "",
                          isCheckable ? "cursor-pointer hover:bg-bg" : "",
                        ].join(" ")}
                        onClick={() => toggleRow(item.id, isCheckable)}
                      >
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!isCheckable}
                            onChange={() => toggleRow(item.id, isCheckable)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 cursor-pointer rounded border-line-2 accent-ink disabled:cursor-default disabled:opacity-40"
                          />
                        </td>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink">
                          {item.ticket_code}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[13px] font-semibold text-ink">
                              {item.holder_name ?? "—"}
                            </span>
                            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                              {item.holder_email ?? item.orders?.buyer_email ?? "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-[13px] text-ink-2">
                          {(item.ticket_types as any)?.name ?? "—"}
                        </td>
                        <td className="px-5 py-3 font-mono text-[12px] text-ink-3">
                          {item.checked_in_at ? fmtDate(item.checked_in_at) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Chip
                            size="sm"
                            variant={ITEM_STATUS_CHIP[item.status] ?? "default"}
                            className="capitalize"
                          >
                            {item.status.replace("_", " ")}
                          </Chip>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {paginator}
          </>
        )}
      </Card>

      {/* Confirmation modal */}
      <Modal open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ModalContent title={`Check in ${selected.size} attendee${selected.size !== 1 ? "s" : ""}?`} size="sm">
          <div className="flex flex-col gap-3">
            <p className="text-[13px] text-ink-2">
              The following attendees will be marked as checked in immediately.
            </p>
            <div className="max-h-48 overflow-y-auto rounded-[var(--radius)] border border-line">
              {selectedAttendees.map((a, i) => (
                <div
                  key={a.id}
                  className={[
                    "flex flex-col gap-0.5 px-3 py-2",
                    i > 0 ? "border-t border-line" : "",
                  ].join(" ")}
                >
                  <span className="text-[13px] font-semibold text-ink">
                    {a.holder_name ?? a.holder_email ?? a.orders?.buyer_email ?? "—"}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                    {a.ticket_code}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </ModalClose>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmCheckIn}
              disabled={loading}
            >
              {loading ? "Checking in…" : `Confirm check-in`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--radius-md)] bg-ink px-4 py-2.5 text-[13px] font-semibold text-surface shadow-[var(--shadow-card)]">
          {toast}
        </div>
      )}
    </>
  )
}
