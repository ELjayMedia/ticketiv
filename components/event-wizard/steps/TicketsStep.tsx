"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, Save, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DEFAULT_TICKET_CURRENCY,
  TICKET_CURRENCY_OPTIONS,
} from "@/lib/payments/ticket-currency"

const SALES_STATUSES = [
  { value: "on_sale", label: "On sale" },
  { value: "paused", label: "Paused" },
  { value: "sold_out", label: "Sold out" },
  { value: "hidden", label: "Hidden" },
]

type TicketForm = {
  name: string
  price: string
  quota: string
  per_user_limit: string
  currency: string
  sales_status: string
  online_quota: string
  online_per_order_limit: string
  is_reserved_seating: boolean
}

function emptyTicketForm(): TicketForm {
  return {
    name: "",
    price: "",
    quota: "",
    per_user_limit: "10",
    currency: DEFAULT_TICKET_CURRENCY,
    sales_status: "on_sale",
    online_quota: "",
    online_per_order_limit: "10",
    is_reserved_seating: false,
  }
}

function channelValue(ticket: any, key: "quota" | "per_order_limit") {
  const online = ticket.ticket_type_channels?.find?.((channel: any) => channel.channel === "online")
  return online?.[key] ?? ""
}

function toForm(ticket: any): TicketForm {
  return {
    name: ticket.name ?? "",
    price: String(((ticket.price_cents ?? 0) / 100).toFixed(2)),
    quota: String(ticket.quota ?? ""),
    per_user_limit: String(ticket.per_user_limit ?? 10),
    currency: ticket.currency ?? DEFAULT_TICKET_CURRENCY,
    sales_status: ticket.sales_status ?? "on_sale",
    online_quota: String(channelValue(ticket, "quota") || ticket.quota || ""),
    online_per_order_limit: String(channelValue(ticket, "per_order_limit") || ticket.per_user_limit || 10),
    is_reserved_seating: Boolean(ticket.is_reserved_seating),
  }
}

export function TicketsStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [ticketTypes, setTicketTypes] = useState<any[]>([])
  const [newTicket, setNewTicket] = useState<TicketForm>(emptyTicketForm())
  const [drafts, setDrafts] = useState<Record<string, TicketForm>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadTicketTypes()
  }, [eventId])

  const hasRequiredNewTicketFields = useMemo(() => Boolean(newTicket.name.trim() && newTicket.price !== "" && newTicket.quota !== ""), [newTicket])

  async function loadTicketTypes() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/tickets`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load ticket types")
      const tickets = payload.tickets || []
      setTicketTypes(tickets)
      setDrafts(Object.fromEntries(tickets.map((ticket: any) => [ticket.id, toForm(ticket)])))
    } catch (err: any) {
      console.error("[v0] Error loading tickets:", err)
      setError(err?.message || "Failed to load ticket types")
    } finally {
      setLoading(false)
    }
  }

  async function addTicket() {
    if (!hasRequiredNewTicketFields) {
      setError("Ticket name, price and quantity are required")
      return
    }

    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicket),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to add ticket type")
      setNewTicket(emptyTicketForm())
      await loadTicketTypes()
    } catch (err: any) {
      console.error("[v0] Error adding ticket:", err)
      setError(err?.message || "Failed to add ticket type")
    } finally {
      setSaving(false)
    }
  }

  async function updateTicket(id: string) {
    const draft = drafts[id]
    if (!draft) return

    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to update ticket type")
      await loadTicketTypes()
    } catch (err: any) {
      console.error("[v0] Error updating ticket:", err)
      setError(err?.message || "Failed to update ticket type")
    } finally {
      setSaving(false)
    }
  }

  async function deleteTicket(id: string) {
    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/tickets/${id}`, { method: "DELETE" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to delete ticket type")
      await loadTicketTypes()
    } catch (err: any) {
      console.error("[v0] Error deleting ticket:", err)
      setError(err?.message || "Failed to delete ticket type")
    } finally {
      setSaving(false)
    }
  }

  function setDraftField(id: string, field: keyof TicketForm, value: string | boolean) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading ticket types...</div>

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 px-3 py-2.5">
        <p className="text-sm font-medium">Paystack payments use ZAR</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose ZAR for Paystack card and bank checkout. SZL is reserved for MTN MoMo once its production credentials are live.
        </p>
      </div>
      <div className="space-y-3">
        <div>
          <h3 className="font-medium">Existing ticket types</h3>
          <p className="text-sm text-muted-foreground">Manage pricing, sales status, online allocation and buyer limits.</p>
        </div>
        {ticketTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ticket types yet</p>
        ) : (
          <div className="space-y-3">
            {ticketTypes.map((ticket) => {
              const draft = drafts[ticket.id] || toForm(ticket)
              return (
                <div key={ticket.id} className="rounded-lg border p-3">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{ticket.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {ticket.currency || DEFAULT_TICKET_CURRENCY} {(ticket.price_cents / 100).toFixed(2)} • {ticket.quota} total • Limit {ticket.per_user_limit ?? 10}/buyer • {ticket.sales_status ?? "on_sale"}
                      </p>
                    </div>
                    <button disabled={saving} onClick={() => deleteTicket(ticket.id)} className="text-red-600 hover:text-red-700 disabled:opacity-50" aria-label="Delete ticket type">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Input placeholder="Ticket name" value={draft.name} onChange={(e) => setDraftField(ticket.id, "name", e.target.value)} disabled={saving} />
                    <select value={draft.currency} onChange={(e) => setDraftField(ticket.id, "currency", e.target.value)} disabled={saving} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Ticket currency">
                      {TICKET_CURRENCY_OPTIONS.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}
                    </select>
                    <Input type="number" min="0" step="0.01" placeholder="Price" value={draft.price} onChange={(e) => setDraftField(ticket.id, "price", e.target.value)} disabled={saving} />
                    <Input type="number" min="0" placeholder="Total quantity" value={draft.quota} onChange={(e) => setDraftField(ticket.id, "quota", e.target.value)} disabled={saving} />
                    <Input type="number" min="0" placeholder="Per-buyer limit" value={draft.per_user_limit} onChange={(e) => setDraftField(ticket.id, "per_user_limit", e.target.value)} disabled={saving} />
                    <select value={draft.sales_status} onChange={(e) => setDraftField(ticket.id, "sales_status", e.target.value)} disabled={saving} className="h-10 rounded-md border bg-background px-3 text-sm">
                      {SALES_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                    <Input type="number" min="0" placeholder="Online quota" value={draft.online_quota} onChange={(e) => setDraftField(ticket.id, "online_quota", e.target.value)} disabled={saving} />
                    <Input type="number" min="0" placeholder="Online per-order limit" value={draft.online_per_order_limit} onChange={(e) => setDraftField(ticket.id, "online_per_order_limit", e.target.value)} disabled={saving} />
                  </div>

                  <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={draft.is_reserved_seating} onChange={(e) => setDraftField(ticket.id, "is_reserved_seating", e.target.checked)} disabled={saving} />
                    Reserved seating placeholder
                  </label>

                  <Button onClick={() => updateTicket(ticket.id)} disabled={saving || !draft.name.trim()} variant="outline" className="mt-3 w-full gap-2">
                    <Save className="h-4 w-4" /> Save ticket controls
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-3 font-medium">Add ticket type</h3>
        <div className="space-y-3">
          <Input placeholder="Ticket name" value={newTicket.name} onChange={(e) => setNewTicket({ ...newTicket, name: e.target.value })} disabled={saving} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="number" min="0" step="0.01" placeholder="Price" value={newTicket.price} onChange={(e) => setNewTicket({ ...newTicket, price: e.target.value })} disabled={saving} />
            <select value={newTicket.currency} onChange={(e) => setNewTicket({ ...newTicket, currency: e.target.value })} disabled={saving} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Ticket currency">
              {TICKET_CURRENCY_OPTIONS.map((currency) => <option key={currency.value} value={currency.value}>{currency.label}</option>)}
            </select>
            <Input type="number" min="0" placeholder="Total quantity" value={newTicket.quota} onChange={(e) => setNewTicket({ ...newTicket, quota: e.target.value, online_quota: e.target.value })} disabled={saving} />
            <Input type="number" min="0" placeholder="Per-buyer limit" value={newTicket.per_user_limit} onChange={(e) => setNewTicket({ ...newTicket, per_user_limit: e.target.value, online_per_order_limit: e.target.value })} disabled={saving} />
            <select value={newTicket.sales_status} onChange={(e) => setNewTicket({ ...newTicket, sales_status: e.target.value })} disabled={saving} className="h-10 rounded-md border bg-background px-3 text-sm">
              {SALES_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <Input type="number" min="0" placeholder="Online quota" value={newTicket.online_quota} onChange={(e) => setNewTicket({ ...newTicket, online_quota: e.target.value })} disabled={saving} />
            <Input type="number" min="0" placeholder="Online per-order limit" value={newTicket.online_per_order_limit} onChange={(e) => setNewTicket({ ...newTicket, online_per_order_limit: e.target.value })} disabled={saving} />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={newTicket.is_reserved_seating} onChange={(e) => setNewTicket({ ...newTicket, is_reserved_seating: e.target.checked })} disabled={saving} />
            Reserved seating placeholder
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={addTicket} disabled={saving || !hasRequiredNewTicketFields} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {saving ? "Saving ticket..." : "Add ticket type"}
          </Button>
        </div>
      </div>
    </div>
  )
}
