"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Trash2, UserPlus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

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

export function GuestlistTab({ eventId }: { eventId: string }) {
  const [state, setState] = useState<GuestlistState | null>(null)
  const [ticketTypes, setTicketTypes] = useState<TicketTypeOption[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [fulfillingEntryId, setFulfillingEntryId] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", allocation: "1", ticket_type_id: "", notes: "" })

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
  }, [eventId])

  const entries = state?.entries ?? []
  const totalAllocation = useMemo(() => entries.reduce((sum, entry) => sum + (entry.allocation ?? 0), 0), [entries])
  const totalFulfilled = useMemo(() => entries.reduce((sum, entry) => sum + (entry.fulfilled_count ?? 0), 0), [entries])

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
      setState((current) => ({ entries: current?.entries ?? [], error: payload.error ?? "Unable to add guest" }))
      return
    }

    setForm({ full_name: "", email: "", phone: "", allocation: "1", ticket_type_id: "", notes: "" })
    setState((current) => ({ entries: current?.entries ?? [], success: "Guest added to guestlist." }))
    await loadGuestlist()
  }

  async function fulfilGuest(entry: GuestlistEntry) {
    if (!entry.ticket_type_id) {
      setState((current) => ({ entries: current?.entries ?? [], error: "Select a ticket type on this guest before fulfilling." }))
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
      setState((current) => ({ entries: current?.entries ?? [], error: payload.error ?? "Unable to fulfil guestlist entry" }))
      return
    }

    setState((current) => ({ entries: current?.entries ?? [], success: `Issued ${payload.tickets?.length ?? remaining} complimentary ticket${(payload.tickets?.length ?? remaining) === 1 ? "" : "s"} for ${entry.full_name}.` }))
    await loadGuestlist()
  }

  async function deleteGuest(entryId: string) {
    const response = await fetch(`/api/events/${eventId}/guestlist?id=${encodeURIComponent(entryId)}`, { method: "DELETE" })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      setState((current) => ({ entries: current?.entries ?? [], error: payload.error ?? "Unable to remove guest" }))
      return
    }

    setState((current) => ({ entries: current?.entries ?? [], success: "Guest removed from guestlist." }))
    await loadGuestlist()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Guestlist entries</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Allocated access</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalAllocation}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fulfilled</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalFulfilled}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add guest</CardTitle>
          <CardDescription>Add complimentary or controlled-access guests for this event.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state?.error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{state.error}</div>}
          {state?.success && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">{state.success}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={form.full_name} onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))} placeholder="Full name" />
            <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email optional" type="email" />
            <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone optional" />
            <Input value={form.allocation} onChange={(event) => setForm((current) => ({ ...current, allocation: event.target.value }))} placeholder="Allocation" type="number" min="1" />
          </div>
          <select
            value={form.ticket_type_id}
            onChange={(event) => setForm((current) => ({ ...current, ticket_type_id: event.target.value }))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">No ticket type selected</option>
            {ticketTypes.map((ticketType) => (
              <option key={ticketType.id} value={ticketType.id}>
                {ticketType.name}
              </option>
            ))}
          </select>
          <Textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes optional" />
          <Button onClick={addGuest} disabled={isSaving || !form.full_name.trim()} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {isSaving ? "Adding..." : "Add guest"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guestlist</CardTitle>
          <CardDescription>Guests can be fulfilled into complimentary tickets, then protected from deletion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!state && <p className="text-sm text-muted-foreground">Loading guestlist…</p>}
          {state && entries.length === 0 && <p className="text-sm text-muted-foreground">No guestlist entries yet.</p>}
          {entries.map((entry) => {
            const remaining = Math.max(0, entry.allocation - entry.fulfilled_count)
            const isFullyFulfilled = remaining <= 0
            return (
              <div key={entry.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{entry.full_name}</h3>
                      <Badge variant="outline">Allocation {entry.allocation}</Badge>
                      {entry.fulfilled_count > 0 && <Badge>Fulfilled {entry.fulfilled_count}</Badge>}
                      {remaining > 0 && <Badge variant="secondary">Remaining {remaining}</Badge>}
                      {entry.ticket_type?.name && <Badge variant="secondary">{entry.ticket_type.name}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{[entry.email, entry.phone].filter(Boolean).join(" · ") || "No contact details"}</p>
                    {entry.notes && <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button variant="default" size="sm" onClick={() => fulfilGuest(entry)} disabled={fulfillingEntryId === entry.id || isFullyFulfilled || !entry.ticket_type_id} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {fulfillingEntryId === entry.id ? "Fulfilling..." : isFullyFulfilled ? "Fulfilled" : `Fulfil ${remaining}`}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteGuest(entry.id)} disabled={entry.fulfilled_count > 0} className="gap-2">
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
