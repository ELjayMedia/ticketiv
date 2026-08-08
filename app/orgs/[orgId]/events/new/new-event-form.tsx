"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import posthog from "posthog-js"

const textareaClass =
  "min-h-24 resize-none rounded-md border border-line-2 bg-surface px-3 py-2.5 text-[14px] font-medium text-ink placeholder:text-ink-4 outline-none transition-shadow duration-100 focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export function NewEventForm({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function createDraft() {
    if (!title.trim()) {
      setError("Event name is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = createClientSupabaseClient()
      const { data, error: rpcError } = await supabase!.rpc("create_event_draft", {
        p_org_id: orgId,
        p_title: title.trim(),
        p_visibility: "private",
      })
      if (rpcError) throw rpcError
      posthog.capture("event_draft_created", { organization_id: orgId })
      router.push(`/orgs/${orgId}/events/${data}/edit?step=basics`)
    } catch (err: any) {
      setError(err?.message || "Failed to create event. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 overflow-auto">
      <div className="flex min-h-dvh items-center justify-center p-4">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="spark" size={22} />
            </span>
            <h1 className="text-h1">Create event</h1>
            <p className="text-[13px] text-ink-3">
              Start by giving your event a name and description. You’ll add more details in the next steps.
            </p>
          </div>

          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-h3">Event details</p>
                <p className="text-[13px] text-ink-3">Basic information about your event.</p>
              </div>

              <FormField
                label="Event name *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Tech Conference 2026"
                onKeyDown={(e) => e.key === "Enter" && createDraft()}
                disabled={loading}
                autoFocus
              />

              <label className="flex flex-col gap-1">
                <span className="text-label">Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your event in a few words…"
                  disabled={loading}
                  className={textareaClass}
                />
              </label>

              {error && (
                <div role="alert" className="rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
                  {error}
                </div>
              )}

              <p className="text-[12px] text-ink-3">
                Don’t worry, you can edit all these details later. Our wizard will guide you through tickets, dates, venue, and more.
              </p>

              <Button onClick={createDraft} disabled={loading || !title.trim()} variant="primary" size="md" block>
                {loading ? "Creating…" : <>Continue <Icon name="arrowR" size={14} /></>}
              </Button>
            </CardBody>
          </Card>

          <p className="text-center font-mono text-[11px] uppercase tracking-wider text-ink-3">
            Tip · use clear, descriptive event names for better search results.
          </p>
        </div>
      </div>
    </main>
  )
}
