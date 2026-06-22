"use client"

import { useState, useTransition } from "react"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { Button } from "@/components/quiet/ui/button"
import { DuplicateEventButton } from "./duplicate-event-button"
import { bulkTransitionEventStatus, bulkDeleteEvents } from "../actions"
import { formatPrice } from "@/lib/format"

export interface EventCardData {
  id: string
  title: string
  description: string | null
  starts_at: string | null
  status: string
  cover_image_url: string | null
  stats: { tickets_sold: number; gross_sales_cents: number; checked_in_count: number }
  capacity: number
}

interface EventsGridProps {
  events: EventCardData[]
  orgId: string
  canDelete: boolean
}

export function EventsGrid({ events, orgId, canDelete }: EventsGridProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  const allSelected = events.length > 0 && selected.size === events.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleCard(id: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      setSelected(new Set(events.map((ev) => ev.id)))
    } else {
      setSelected(new Set())
    }
  }

  function showMessage(text: string, ok: boolean) {
    setMessage({ text, ok })
    setTimeout(() => setMessage(null), 4000)
  }

  function handlePublish() {
    const ids = Array.from(selected)
    startTransition(async () => {
      const result = await bulkTransitionEventStatus(orgId, ids, "published")
      if (result.ok) {
        showMessage(
          `Published ${result.succeeded} event${result.succeeded !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} failed)` : ""}.`,
          true,
        )
        setSelected(new Set())
      } else {
        showMessage(result.error ?? "Failed to publish events.", false)
      }
    })
  }

  function handleArchive() {
    const ids = Array.from(selected)
    if (
      !window.confirm(
        `Archive ${ids.length} event${ids.length !== 1 ? "s" : ""}? This will hide them from your public pages.`,
      )
    )
      return
    startTransition(async () => {
      const result = await bulkTransitionEventStatus(orgId, ids, "archived")
      if (result.ok) {
        showMessage(
          `Archived ${result.succeeded} event${result.succeeded !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} failed)` : ""}.`,
          true,
        )
        setSelected(new Set())
      } else {
        showMessage(result.error ?? "Failed to archive events.", false)
      }
    })
  }

  function handleDelete() {
    const ids = Array.from(selected)
    if (
      !window.confirm(
        `Permanently delete ${ids.length} event${ids.length !== 1 ? "s" : ""}? Only draft and archived events can be deleted. This cannot be undone.`,
      )
    )
      return
    startTransition(async () => {
      const result = await bulkDeleteEvents(orgId, ids)
      if (result.ok) {
        showMessage(
          `Deleted ${result.succeeded} event${result.succeeded !== 1 ? "s" : ""}${result.failed > 0 ? ` (${result.failed} skipped — not draft/archived)` : ""}.`,
          true,
        )
        setSelected(new Set())
      } else {
        showMessage(result.error ?? "Failed to delete events.", false)
      }
    })
  }

  return (
    <>
      {/* Select-all header row */}
      <div className="flex items-center gap-2 pb-1">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-3 select-none">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected
            }}
            onChange={toggleAll}
            className="h-4 w-4 cursor-pointer rounded accent-ink"
            aria-label="Select all events"
          />
          {selected.size > 0 ? (
            <span className="text-ink">
              {selected.size} of {events.length} selected
            </span>
          ) : (
            <span>Select all</span>
          )}
        </label>
      </div>

      {/* Events grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => {
          const isSelected = selected.has(event.id)
          const sellThroughPct =
            event.capacity > 0
              ? Math.min(100, (event.stats.tickets_sold / event.capacity) * 100)
              : null
          const checkInRate =
            event.stats.tickets_sold > 0
              ? Math.min(100, (event.stats.checked_in_count / event.stats.tickets_sold) * 100)
              : null

          return (
            <div key={event.id} className="group relative block">
              <Link href={`/orgs/${orgId}/events/${event.id}`} className="block">
                <Card
                  className={[
                    "flex h-full flex-col overflow-hidden transition-all duration-200 group-hover:border-line-2",
                    isSelected ? "ring-2 ring-ink ring-offset-2 ring-offset-bg" : "",
                  ].join(" ")}
                >
                  <div className="relative h-48 w-full overflow-hidden bg-bg">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon name="cal" size={32} className="text-ink-4" />
                      </div>
                    )}

                    {/* Checkbox overlay — top-left */}
                    <button
                      type="button"
                      onClick={(e) => toggleCard(event.id, e)}
                      aria-label={isSelected ? "Deselect event" : "Select event"}
                      className={[
                        "absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded border-2 bg-surface transition-all duration-150",
                        "opacity-0 sm:group-hover:opacity-100",
                        // Always visible on mobile
                        "max-sm:opacity-100",
                        isSelected
                          ? "!opacity-100 border-ink bg-ink text-surface"
                          : "border-line-2 text-transparent hover:border-ink-2",
                      ].join(" ")}
                    >
                      {isSelected && <Icon name="check" size={12} />}
                    </button>

                    <div className="absolute right-3 top-3">
                      <Chip size="sm" variant={event.status === "published" ? "active" : "muted"}>
                        {event.status}
                      </Chip>
                    </div>
                  </div>

                  <CardBody className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <h3 className="line-clamp-2 text-[16px] font-semibold leading-tight text-ink">
                        {event.title}
                      </h3>
                      {event.description && (
                        <p className="line-clamp-1 text-[13px] text-ink-3">{event.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
                      <Icon name="cal" size={12} />
                      <span className="truncate">
                        {event.starts_at
                          ? new Date(event.starts_at).toLocaleDateString("en-SZ", {
                              dateStyle: "medium",
                            })
                          : "Date TBA"}
                      </span>
                    </div>

                    <CardDivider />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                          Tickets sold
                        </p>
                        <p className="font-mono text-[16px] font-semibold tabular-nums text-ink">
                          {event.stats.tickets_sold.toLocaleString()}
                          {event.capacity > 0 && (
                            <span className="ml-1 text-[11px] text-ink-3">
                              / {event.capacity.toLocaleString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                          Revenue
                        </p>
                        <p className="inline-flex items-center gap-1 font-mono text-[16px] font-semibold tabular-nums text-ink">
                          <Icon name="trending" size={14} className="text-success" />
                          {event.stats.gross_sales_cents > 0 ? (
                            formatPrice(event.stats.gross_sales_cents, "SZL")
                          ) : (
                            <span className="text-[13px] text-ink-3">—</span>
                          )}
                        </p>
                      </div>
                      {sellThroughPct !== null && (
                        <div className="flex flex-col gap-0.5">
                          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                            Sell-through
                          </p>
                          <p
                            className={[
                              "font-mono text-[16px] font-semibold tabular-nums",
                              sellThroughPct >= 80
                                ? "text-success"
                                : sellThroughPct >= 50
                                  ? "text-warning"
                                  : "text-ink",
                            ].join(" ")}
                          >
                            {sellThroughPct.toFixed(0)}%
                          </p>
                        </div>
                      )}
                      {checkInRate !== null && (
                        <div className="flex flex-col gap-0.5">
                          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                            Check-in rate
                          </p>
                          <p className="font-mono text-[16px] font-semibold tabular-nums text-ink">
                            {checkInRate.toFixed(0)}%
                          </p>
                        </div>
                      )}
                    </div>

                    <CardDivider />

                    <div className="flex justify-end">
                      <DuplicateEventButton orgId={orgId} eventId={event.id} />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Bulk action bar — slides up from bottom when selection > 0 */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 border-t border-line bg-surface px-4 py-3 transition-transform duration-200 ${
          selected.size > 0 ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          {message ? (
            <span
              className={`font-mono text-[12px] ${message.ok ? "text-ink" : "text-danger"}`}
            >
              {message.text}
            </span>
          ) : (
            <span className="font-mono text-[12px] text-ink-3">
              {selected.size} event{selected.size !== 1 ? "s" : ""} selected
            </span>
          )}
          <span className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublish}
            disabled={isPending}
          >
            Publish
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={isPending}
          >
            Archive
          </Button>
          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger-soft"
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            disabled={isPending}
          >
            Clear
          </Button>
        </div>
      </div>
    </>
  )
}
