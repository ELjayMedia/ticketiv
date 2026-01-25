"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

export function TicketsStep({
  eventId,
  onSaving,
}: {
  eventId: string
  onSaving: () => void
}) {
  const [ticketTypes, setTicketTypes] = useState<any[]>([])
  const [newTicket, setNewTicket] = useState({ name: "", price: "", quota: "" })

  useEffect(() => {
    loadTicketTypes()
  }, [eventId])

  async function loadTicketTypes() {
    const supabase = createClientSupabaseClient()
    const { data } = await supabase
      .from("ticket_types")
      .select("id, name, price_cents, quota")
      .eq("event_id", eventId)
      .order("created_at")

    setTicketTypes(data || [])
  }

  async function addTicket() {
    if (!newTicket.name.trim() || !newTicket.price || !newTicket.quota) {
      return
    }

    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      const { error } = await supabase.from("ticket_types").insert({
        event_id: eventId,
        name: newTicket.name,
        price_cents: Math.round(parseFloat(newTicket.price) * 100),
        quota: parseInt(newTicket.quota, 10),
      })

      if (error) throw error

      setNewTicket({ name: "", price: "", quota: "" })
      await loadTicketTypes()
    } catch (err) {
      console.error("[v0] Error adding ticket:", err)
    }
  }

  async function deleteTicket(id: string) {
    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      const { error } = await supabase.from("ticket_types").delete().eq("id", id)

      if (error) throw error
      await loadTicketTypes()
    } catch (err) {
      console.error("[v0] Error deleting ticket:", err)
    }
  }

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
                    R{(ticket.price_cents / 100).toFixed(2)} • {ticket.quota} available
                  </p>
                </div>
                <button onClick={() => deleteTicket(ticket.id)} className="text-red-600 hover:text-red-700">
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
          <Input
            placeholder="Ticket name (e.g. Early Bird)"
            value={newTicket.name}
            onChange={(e) => setNewTicket({ ...newTicket, name: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Price (ZAR)"
            value={newTicket.price}
            onChange={(e) => setNewTicket({ ...newTicket, price: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Quantity available"
            value={newTicket.quota}
            onChange={(e) => setNewTicket({ ...newTicket, quota: e.target.value })}
          />
          <Button onClick={addTicket} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add ticket type
          </Button>
        </div>
      </div>
    </div>
  )
}
