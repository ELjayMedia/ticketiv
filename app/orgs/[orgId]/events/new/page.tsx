"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { usePermissions } from "@/lib/providers/permissions-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, Sparkles } from "lucide-react"

export default function NewEventPage() {
  const router = useRouter()
  const params = useParams<{ orgId: string }>()
  const { permissions, activeOrgId } = usePermissions()

  const orgId = params.orgId
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
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
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle>Permission Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">You need to be an organizer or admin to create events.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Event</h1>
            <p className="text-muted-foreground">
              Start by giving your event a name and description. You'll add more details in the next steps.
            </p>
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Details</CardTitle>
              <CardDescription>Basic information about your event</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Event Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Event Name *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Tech Conference 2026"
                  onKeyDown={(e) => e.key === "Enter" && createDraft()}
                  disabled={loading}
                  autoFocus
                  className="h-10"
                />
              </div>

              {/* Event Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event in a few words..."
                  disabled={loading}
                  className="min-h-24 resize-none"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Helper Text */}
              <p className="text-xs text-muted-foreground">
                Don't worry, you can edit all these details later. Our wizard will guide you through tickets, dates, venue, and more.
              </p>

              {/* Submit Button */}
              <Button 
                onClick={createDraft} 
                disabled={loading || !title.trim()} 
                className="w-full gap-2 h-10"
                size="lg"
              >
                {loading ? "Creating..." : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Footer Tips */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            <p>✨ Tip: Use clear, descriptive event names for better search results</p>
          </div>
        </div>
      </div>
    </main>
  )
}
