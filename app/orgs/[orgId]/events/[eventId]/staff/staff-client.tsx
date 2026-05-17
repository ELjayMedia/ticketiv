"use client"

import { useState } from "react"
import { AlertCircle, Plus, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export type StaffMember = {
  user_id: string
  role: string
  email: string | null
}

const ROLES = [
  { value: "scanner", label: "Scanner" },
  { value: "organizer_staff", label: "Event Staff" },
  { value: "organizer_admin", label: "Event Admin" },
]

function roleLabel(role: string) {
  return ROLES.find((item) => item.value === role)?.label ?? role
}

function initials(email: string | null) {
  return (email?.trim()?.[0] ?? "?").toUpperCase()
}

export function EventStaffClient({
  eventId,
  canManage,
  initialStaff,
}: {
  eventId: string
  canManage: boolean
  initialStaff: StaffMember[]
}) {
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff)
  const [error, setError] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("scanner")
  const [submitting, setSubmitting] = useState(false)
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function addStaff() {
    if (!email.trim()) {
      setError("Email address is required")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to add staff member")

      const added: StaffMember = {
        user_id: payload.staff.user_id,
        role: payload.staff.role,
        email: payload.staff.email ?? email.trim(),
      }
      setStaff((prev) => [...prev.filter((item) => item.user_id !== added.user_id), added])
      setEmail("")
      setRole("scanner")
      setAddOpen(false)
    } catch (err: any) {
      setError(err?.message || "Failed to add staff member")
    } finally {
      setSubmitting(false)
    }
  }

  async function removeStaff(userId: string) {
    setRemovingId(userId)
    setError("")
    const previous = staff
    setStaff((prev) => prev.filter((item) => item.user_id !== userId))
    try {
      const response = await fetch(`/api/events/${eventId}/staff/${userId}`, { method: "DELETE" })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to remove staff member")
    } catch (err: any) {
      setStaff(previous)
      setError(err?.message || "Failed to remove staff member")
    } finally {
      setRemovingId(null)
      setConfirmingRemoval(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Event staff</CardTitle>
            <CardDescription>People who can scan tickets on event day</CardDescription>
          </div>
          {canManage && staff.length > 0 && (
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add staff
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground mb-4">
                No staff added yet. Add team members so they can scan tickets on event day.
              </p>
              {canManage && (
                <Button onClick={() => setAddOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add your first staff member
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {staff.map((member) => (
                <div key={member.user_id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <Avatar>
                    <AvatarFallback>{initials(member.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.email ?? member.user_id}</p>
                  </div>
                  <Badge variant="secondary">{roleLabel(member.role)}</Badge>
                  {canManage &&
                    (confirmingRemoval === member.user_id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={removingId === member.user_id}
                          onClick={() => removeStaff(member.user_id)}
                        >
                          {removingId === member.user_id ? "Removing..." : "Remove"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={removingId === member.user_id}
                          onClick={() => setConfirmingRemoval(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${member.email ?? member.user_id}`}
                        onClick={() => setConfirmingRemoval(member.user_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Staff can scan tickets by going to ticketiv.com/scan and selecting this event. Make sure they are added here
        first.
      </p>

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add staff member</SheetTitle>
            <SheetDescription>
              Enter the email address of an existing Ticketiv account. They must sign up before they can be added.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email address</Label>
              <Input
                id="staff-email"
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
                onKeyDown={(event) => event.key === "Enter" && addStaff()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select value={role} onValueChange={setRole} disabled={submitting}>
                <SelectTrigger id="staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={addStaff} disabled={submitting || !email.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              {submitting ? "Adding..." : "Add staff"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
