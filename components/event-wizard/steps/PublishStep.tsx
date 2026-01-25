"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2 } from "lucide-react"

export function PublishStep({
  event,
  onSaving,
}: {
  event: any
  onSaving: () => void
}) {
  const [published, setPublished] = useState(event?.status === "published")
  const [staff, setStaff] = useState<any[]>([])
  const [newStaffEmail, setNewStaffEmail] = useState("")
  const [newStaffRole, setNewStaffRole] = useState("scanner")

  useEffect(() => {
    loadStaff()
  }, [event?.id])

  async function loadStaff() {
    const supabase = createClientSupabaseClient()
    const { data } = await supabase
      .from("event_staff")
      .select("id, user:users(email), role")
      .eq("event_id", event?.id)
      .order("created_at")

    setStaff(data || [])
  }

  async function togglePublish() {
    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from("events")
        .update({ status: published ? "draft" : "published" })
        .eq("id", event?.id)

      if (error) throw error
      setPublished(!published)
    } catch (err) {
      console.error("[v0] Error toggling publish:", err)
    }
  }

  async function addStaff() {
    if (!newStaffEmail.trim()) return

    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      // Note: In production, you'd look up the user by email first
      const { error } = await supabase.from("event_staff").insert({
        event_id: event?.id,
        user_email: newStaffEmail,
        role: newStaffRole,
      })

      if (error) throw error
      setNewStaffEmail("")
      await loadStaff()
    } catch (err) {
      console.error("[v0] Error adding staff:", err)
    }
  }

  async function removeStaff(id: string) {
    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      const { error } = await supabase.from("event_staff").delete().eq("id", id)

      if (error) throw error
      await loadStaff()
    } catch (err) {
      console.error("[v0] Error removing staff:", err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Publish event</h3>
            <p className="text-sm text-muted-foreground">Make this event visible to the public</p>
          </div>
          <Button onClick={togglePublish} variant={published ? "destructive" : "default"}>
            {published ? "Unpublish" : "Publish"}
          </Button>
        </div>
        <div className="mt-3">
          <Badge variant={published ? "default" : "secondary"}>{published ? "Published" : "Draft"}</Badge>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-medium">Event staff</h3>

        {staff.length > 0 && (
          <div className="space-y-2">
            {staff.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{s.user?.email || "Unknown"}</p>
                  <Badge variant="outline" className="mt-1">
                    {s.role}
                  </Badge>
                </div>
                <button onClick={() => removeStaff(s.id)} className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4">
          <p className="mb-3 text-sm font-medium">Add staff member</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="staff@example.com"
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              className="flex-1"
            />
            <select
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value)}
              className="rounded-lg border px-3 py-2"
            >
              <option value="scanner">Scanner</option>
              <option value="staff">Staff</option>
              <option value="organizer">Organizer</option>
            </select>
            <Button onClick={addStaff} variant="outline" className="gap-2 bg-transparent">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
