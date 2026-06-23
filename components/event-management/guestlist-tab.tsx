"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Button } from "@/components/quiet/ui/button"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"

type TicketTypeOption = {
  id: string
  name: string
}

type GuestlistEntry = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  allocation: number
  notes: string | null
  ticket_type_id: string | null
  ticket_type?: TicketTypeOption | null
  fulfilled_count: number
  created_at: string | null
}

type GuestlistState = {
  entries: GuestlistEntry[]
  error?: string
  success?: string
}

type TicketTypesState = {
  tickets: TicketTypeOption[]
}

const inputClass =
  "w-full rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink " +
  "outline-none transition-shadow duration-100 placeholder:text-ink-4 " +
  "focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export function GuestlistTab({ eventId }: { eventId: string }) {
  const [state, setState] = useState<GuestlistState | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [fulfillingEntryId, setFulfillingEntryId] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    allocation: "1",
    ticket_type_id: "",
    notes: "",
  })

  async function loadGuestlist() {
    const response = await fetch(`/api/events/${eventId}/guestlist`, { cache: "no-store" })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setState({ entries: [], error: payload.error ?? "Unable to load guestlist" })
    else setState((current) => ({ entries: payload.entries ?? [], success: current?.success }))
  }

  async function loadTicketTypes() {
    const response = await fetch(`/api/events/${eventId}/ticket-types`, { cache: "no-store" })
    const payload = (await response.json().catch(() => ({}))) as TicketTypesState
    if (response.ok) setTicketTypes(payload.tickets ?? [])
  }

  useEffect(() => {
    loadGuestlist()
    loadTicketTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const entries = state?.entries ?? []
  const totalAllocation = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.allocation ?? 0), 0),
    [entries],
  )
  const totalFulfilled = useMemo(
    () => entries.reduce((sum, entry) => sum + (entry.fulfilled_count ?? 0), 0),
    [entries],
  )

  async function addGuest() {
    if (!form.full_name.trim()) return
    setIsSaving(true)
    const response = await fetch(`/api/events/${eventId}/guestlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        allocation: Number(form.allocation) || 1,
        ticket_type_id: form.ticket_type_id || null,
        notes: form.notes || null,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    setIsSaving(false)
    if (!response.ok) {
      setState((current) => ({
        entries: current?.entries ?? [],
        error: payload.error ?? "Unable to add guest",
      }))
      return
    }
    setForm({ full_name: "", email: "", phone: "", allocation: "1", ticket_type_id: "", notes: "" })
    setState((current) => ({ entries: current?.entries ?? [], success: "Guest added to guestlist." }))
    await loadGuestlist()
  }

  async function fulfilGuest(entry: GuestlistEntry) {
    if (!entry.ticket_type_id) {
      setState((current) => ({
        entries: current?.entries ?? [],
        error: "Select a ticket type on this guest before fulfilling.",
      }))
      return
    }
    const remaining = Math.max(0, entry.allocation - entry.fulfilled_count)
    if (remaining <= 0) return
    setFulfillingEntryId(entry.id)
    const response = await fetch(`/api/events/${eventId}/guestlist/${entry.id}/fulfil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: remaining, ticket_type_id: entry.ticket_type_id }),
    })
    const payload = await response.json().catch(() => ({}))
    setFulfillingEntryId(null)
    if (!response.ok) {
      setState((current) => ({
        entries: current?.entries ?? [],
        error: payload.error ?? "Unable to fulfil guestlist entry",
      }))
      return
    }
    const issued = payload.tickets?.length ?? remaining
    setState((current) => ({
      entries: current?.entries ?? [],
      success: `Issued ${issued} complimentary ticket${issued === 1 ? "" : "s"} for ${entry.full_name}.`,
    }))
    await loadGuestlist()
  }

  async function deleteGuest(entryId: string) {
    const response = await fetch(
      `/api/events/${eventId}/guestlist?id=${encodeURIComponent(entryId)}`,
      { method: "DELETE" },
    )
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setState((current) => ({
        entries: current?.entries ?? [],
        error: payload.error ?? "Unable to remove guest",
      }))
      return
    }
    setState((current) => ({
      entries: current?.entries ?? [],
      success: "Guest removed from guestlist.",
    }))
    await loadGuestlist()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Guestlist entries", value: entries.length },
          { label: "Allocated access", value: totalAllocation },
          { label: "Fulfilled", value: totalFulfilled },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardBody>
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
              <p className="font-mono text-[22px] font-semibold tabular-nums">{value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardBody>
          <h3 className="text-h3">Add guest</h3>
          <p className="mt-0.5 text-sm text-ink-3">Add complimentary or controlled-access guests for this event.</p>
        </CardBody>
        <CardDivider />
        <CardBody className="space-y-4">
          {state?.error && (
            <div className="rounded-[var(--radius)] border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              {state.error}
            </div>
          )}
          {state?.success && (
            <div className="rounded-[var(--radius)] border border-accent/30 bg-accent-soft p-3 text-sm text-accent">
              {state.success}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={inputClass}
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Full name"
            />
            <input
              className={inputClass}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email (optional)"
              type="email"
            />
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone (optional)"
            />
            <input
              className={inputClass}
              value={form.allocation}
              onChange={(e) => setForm((f) => ({ ...f, allocation: e.target.value }))}
              placeholder="Allocation"
              type="number"
              min="1"
            />
          </div>
          <select
            value={form.ticket_type_id}
            onChange={(e) => setForm((f) => ({ ...f, ticket_type_id: e.target.value }))}
            className={inputClass}
          >
            <option value="">No ticket type selected</option>
            {ticketTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <textarea
            className={inputClass + " min-h-[80px] resize-y"}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Notes (optional)"
          />
          <Button
            variant="primary"
            onClick={addGuest}
            disabled={isSaving || !form.full_name.trim()}
          >
            <Icon name="users" size={16} />
            {isSaving ? "Adding…" : "Add guest"}
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="text-h3">Guestlist</h3>
          <p className="mt-0.5 text-sm text-ink-3">
            Guests can be fulfilled into complimentary tickets, then protected from deletion.
          </p>
        </CardBody>
        <CardDivider />
        <CardBody className="space-y-3">
          {!state && <p className="text-sm text-ink-3">Loading guestlist…</p>}
          {state && entries.length === 0 && (
            <p className="text-sm text-ink-3">No guestlist entries yet.</p>
          )}
          {entries.map((entry) => {
            const remaining = Math.max(0, entry.allocation - entry.fulfilled_count)
            const isFullyFulfilled = remaining <= 0
            return (
              <div key={entry.id} className="rounded-[var(--radius)] border border-line p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{entry.full_name}</h4>
                      <Chip size="sm" variant="default">Allocation {entry.allocation}</Chip>
                      {entry.fulfilled_count > 0 && (
                        <Chip size="sm" variant="accent">Fulfilled {entry.fulfilled_count}</Chip>
                      )}
                      {remaining > 0 && (
                        <Chip size="sm" variant="muted">Remaining {remaining}</Chip>
                      )}
                      {entry.ticket_type?.name && (
                        <Chip size="sm" variant="muted">{entry.ticket_type.name}</Chip>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-3">
                      {[entry.email, entry.phone].filter(Boolean).join(" · ") || "No contact details"}
                    </p>
                    {entry.notes && (
                      <p className="mt-2 text-sm text-ink-3">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => fulfilGuest(entry)}
                      disabled={fulfillingEntryId === entry.id || isFullyFulfilled || !entry.ticket_type_id}
                    >
                      <Icon name="check" size={16} />
                      {fulfillingEntryId === entry.id
                        ? "Fulfilling…"
                        : isFullyFulfilled
                          ? "Fulfilled"
                          : `Fulfil ${remaining}`}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteGuest(entry.id)}
                      disabled={entry.fulfilled_count > 0}
                      className="border-danger text-danger hover:bg-danger-soft"
                    >
                      <Icon name="trash" size={16} /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>
    </div>
  )
}
