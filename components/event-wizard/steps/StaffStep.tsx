"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

const ROLES = [
  { value: "scanner", label: "Scanner" },
  { value: "organizer_staff", label: "Event Staff" },
  { value: "organizer_admin", label: "Event Admin" },
]

export function StaffStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [staff, setStaff] = useState<any[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("scanner")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadStaff()
  }, [eventId])

  async function loadStaff() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/staff`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load staff")
      setStaff(payload.staff || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load staff")
    } finally {
      setLoading(false)
    }
  }

  async function addStaff() {
    if (!email.trim()) return setError("Email is required")
    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to add staff")
      setEmail("")
      setRole("scanner")
      await loadStaff()
    } catch (err: any) {
      setError(err?.message || "Failed to add staff")
    } finally {
      setSaving(false)
    }
  }

  async function removeStaff(userId: string) {
    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/staff/${userId}`, { method: "DELETE" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to remove staff")
      await loadStaff()
    } catch (err: any) {
      setError(err?.message || "Failed to remove staff")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading staff...</div>

  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        Add scanners and event staff. Staff must already have a Ticketiv account before they can be assigned.
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">Assigned staff</h3>
        {staff.filter((item) => item.active !== false).length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {staff
              .filter((item) => item.active !== false)
              .map((item) => (
                <div key={`${item.event_id}-${item.user_id}`} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{item.email || item.user_id}</p>
                    <p className="text-sm text-muted-foreground">{ROLES.find((roleItem) => roleItem.value === item.role)?.label || item.role}</p>
                  </div>
                  <button disabled={saving} onClick={() => removeStaff(item.user_id)} className="text-red-600 hover:text-red-700 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-3 font-medium">Add staff member</h3>
        <div className="space-y-3">
          <Input type="email" placeholder="staff@example.com" value={email} onChange={(event) => setEmail(event.target.value)} disabled={saving} />
          <select value={role} onChange={(event) => setRole(event.target.value)} disabled={saving} className="w-full rounded-lg border bg-background px-3 py-2 text-sm">
            {ROLES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={addStaff} disabled={saving || !email.trim()} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            {saving ? "Saving staff..." : "Add staff"}
          </Button>
        </div>
      </div>
    </div>
  )
}
