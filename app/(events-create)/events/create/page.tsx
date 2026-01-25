"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { usePermissions } from "@/lib/providers/permissions-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CreateEventPage() {
  const router = useRouter()
  const { permissions } = usePermissions()

  const [title, setTitle] = useState("")
  const [selectedOrgId, setSelectedOrgId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Get list of orgs user can create events in (organizer/admin role)
  const creatableOrgs =
    permissions?.orgMemberships.filter((m) => m.role === "admin" || m.role === "organizer") || []

  // Auto-select first org if only one available
  const defaultOrgId = creatableOrgs.length === 1 ? creatableOrgs[0].org_id : ""

  const canCreateEvent = creatableOrgs.length > 0
  const orgId = selectedOrgId || defaultOrgId

  async function createDraft() {
    if (!title.trim()) {
      setError("Event name is required")
      return
    }

    if (!orgId) {
      setError("Please select an organization")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = createClientSupabaseClient()

      const { data, error: rpcError } = await supabase.rpc("create_event_draft", {
        p_org_id: orgId,
        p_title: title.trim(),
        p_visibility: "private",
      })

      if (rpcError) throw rpcError

      const eventId = data
      router.push(`/orgs/${orgId}/events/${eventId}/edit?step=basics`)
    } catch (err: any) {
      console.error("[v0] Error creating event:", err)
      setError(err?.message || "Failed to create event. Please try again.")
      setLoading(false)
    }
  }

  if (!canCreateEvent) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Card>
          <CardHeader>
            <CardTitle>Permission denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You need to be an organizer or admin in at least one organization to create events.
            </p>
            <p className="text-xs text-muted-foreground">
              Ask an admin to add you to an organization with organizer permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Create event</h1>
        <p className="text-muted-foreground">Start by giving your event a name and selecting an organization</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {creatableOrgs.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization</label>
              <Select value={selectedOrgId || defaultOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {creatableOrgs.map((org) => (
                    <SelectItem key={org.org_id} value={org.org_id}>
                      {org.name || org.org_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Event name</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Business Expo 2026"
              onKeyDown={(e) => e.key === "Enter" && createDraft()}
              disabled={loading}
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button onClick={createDraft} disabled={loading || !title.trim()} className="w-full">
            {loading ? "Creating..." : "Create draft"}
          </Button>

          <p className="text-xs text-muted-foreground">
            You'll be able to add details, dates, tickets, and more in the next steps.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
