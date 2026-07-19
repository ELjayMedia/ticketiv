"use client"

import { useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { Avatar } from "@/components/quiet/ui/primitives"

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

const selectClass =
  "rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

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
    <div className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
          <Icon name="close" size={14} className="mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardBody className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-h3">Event staff</p>
            <p className="text-[13px] text-ink-3">People who can scan tickets on event day.</p>
          </div>
          {canManage && staff.length > 0 && (
            <Button onClick={() => setAddOpen((v) => !v)} variant="primary" size="sm">
              <Icon name="plus" size={14} /> Add staff
            </Button>
          )}
        </CardBody>
        {canManage && addOpen && (
          <>
            <CardDivider />
            <CardBody className="flex flex-col gap-4">
              <p className="text-h3">Add staff member</p>
              <p className="text-[12px] text-ink-3">
                Enter the email address of an existing Ticketiv account. They must sign up before they can be added.
              </p>
              <FormField
                label="Email address"
                type="email"
                placeholder="staff@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={submitting}
                onKeyDown={(event) => event.key === "Enter" && addStaff()}
                autoFocus
              />
              <label className="flex flex-col gap-1">
                <span className="text-label">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={submitting}
                  className={selectClass}
                >
                  {ROLES.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <Button onClick={addStaff} disabled={submitting || !email.trim()} variant="primary" size="md">
                  <Icon name="plus" size={14} />
                  {submitting ? "Adding…" : "Add staff"}
                </Button>
                <Button onClick={() => setAddOpen(false)} variant="ghost" size="md" disabled={submitting}>
                  Cancel
                </Button>
              </div>
            </CardBody>
          </>
        )}
        <CardDivider />
        <CardBody>
          {staff.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <p className="text-[13px] text-ink-3">
                No staff added yet. Add team members so they can scan tickets on event day.
              </p>
              {canManage && (
                <Button onClick={() => setAddOpen(true)} variant="primary" size="md">
                  <Icon name="plus" size={14} />
                  Add your first staff member
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[var(--color-line)]">
              {staff.map((member) => (
                <div key={member.user_id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <Avatar size={36} label={initials(member.email)} />
                  <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                    {member.email ?? member.user_id}
                  </p>
                  <Chip size="sm" variant="muted">{roleLabel(member.role)}</Chip>
                  {canManage &&
                    (confirmingRemoval === member.user_id ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={removingId === member.user_id}
                          onClick={() => removeStaff(member.user_id)}
                          className="bg-danger border-danger hover:bg-danger/90"
                        >
                          {removingId === member.user_id ? "Removing…" : "Remove"}
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
                      <button
                        type="button"
                        aria-label={`Remove ${member.email ?? member.user_id}`}
                        onClick={() => setConfirmingRemoval(member.user_id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <p className="text-[12px] text-ink-3">
        Staff can scan tickets by going to ticketiv.app/scan and selecting this event. Make sure they are added here first.
      </p>
    </div>
  )
}
