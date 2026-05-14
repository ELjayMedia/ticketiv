"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

export function TicketsStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [ticketTypes, setTicketTypes] = useState<any[]>([])
  const [newTicket, setNewTicket] = useState({ name: "", price: "", quota: "", per_user_limit: "10", currency: "SZL" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadTicketTypes()
  }, [eventId])

  async function loadTicketTypes() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/tickets`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load ticket types")
      setTicketTypes(payload.tickets || [])
    } catch (err: any) {
      console.error("[v0] Error loading tickets:", err)
      setError(err?.message || "Failed to load ticket types")
    } finally {
      setLoading(false)
    }
  }

  async function addTicket() {
    if (!newTicket.name.trim() || !newTicket.price || !newTicket.quota) {
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
      setNewTicket({ name: "", price: "", quota: "", per_user_limit: "10", currency: "SZL" })
      await loadTicketTypes()
    } catch (err: any) {
      console.error("[v0] Error adding ticket:", err)
      setError(err?.message || "Failed to add ticket type")
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

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading ticket types...</div>

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="font-medium">Existing ticket types</h3>
        {ticketTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ticket types yet</p>
        ) : (
          <div className="space-y-2">
            {ticketTypes.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{ticket.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.currency || "SZL"} {(ticket.price_cents / 100).toFixed(2)} • {ticket.quota} available • Limit {ticket.per_user_limit ?? 10}/buyer
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Status: {ticket.sales_status ?? "on_sale"}</p>
                </div>
                <button disabled={saving} onClick={() => deleteTicket(ticket.id)} className="text-red-600 hover:text-red-700 disabled:opacity-50" aria-label="Delete ticket type">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-3 font-medium">Add ticket type</h3>
        <div className="space-y-3">
          <Input placeholder="Ticket name" value={newTicket.name} onChange={(e) => setNewTicket({ ...newTicket, name: e.target.value })} disabled={saving} />
          <div className="grid gap-3 md:grid-cols-3">
            <Input type="number" min="0" step="0.01" placeholder="Price" value={newTicket.price} onChange={(e) => setNewTicket({ ...newTicket, price: e.target.value })} disabled={saving} />
            <Input placeholder="Currency" value={newTicket.currency} onChange={(e) => setNewTicket({ ...newTicket, currency: e.target.value.toUpperCase().slice(0, 3) })} disabled={saving} />
            <Input type="number" min="0" placeholder="Quantity" value={newTicket.quota} onChange={(e) => setNewTicket({ ...newTicket, quota: e.target.value })} disabled={saving} />
          </div>
          <Input type="number" min="0" placeholder="Per-buyer limit" value={newTicket.per_user_limit} onChange={(e) => setNewTicket({ ...newTicket, per_user_limit: e.target.value })} disabled={saving} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={addTicket} disabled={saving || !newTicket.name.trim() || !newTicket.price || !newTicket.quota} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {saving ? "Saving ticket..." : "Add ticket type"}
          </Button>
        </div>
      </div>
    </div>
  )
}
