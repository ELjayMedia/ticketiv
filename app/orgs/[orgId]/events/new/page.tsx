"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { usePermissions } from "@/lib/providers/permissions-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function NewEventPage() {
  const router = useRouter()
  const params = useParams<{ orgId: string }>()
  const { permissions, activeOrgId } = usePermissions()

  const orgId = params.orgId
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Permission check
  const canCreateEvent =
    permissions &&
    permissions.orgMemberships.some((m) => m.org_id === orgId && (m.role === "admin" || m.role === "organizer"))

  async function createDraft() {
    if (!title.trim()) {
      setError("Event name is required")
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
          <CardContent>
            <p className="text-sm text-muted-foreground">You need to be an organizer or admin to create events.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Create event</h1>
        <p className="text-muted-foreground">Start by giving your event a name</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Event name</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Business Expo 2026"
            onKeyDown={(e) => e.key === "Enter" && createDraft()}
            disabled={loading}
            autoFocus
          />

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
