"use client"

import { type FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import posthog from "posthog-js"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { buildCreateEventDraftParams, normalizeEventTitle } from "@/lib/events/create-event-draft"
import { createClientSupabaseClient } from "@/lib/supabase-client"

export function NewEventForm({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!normalizeEventTitle(title)) {
      setError("Event name is required")
      return
    }

    setLoading(true)
    setError("")

    try {
      const supabase = createClientSupabaseClient()
      if (!supabase) throw new Error("Unable to connect. Please refresh and try again.")

      const { data, error: rpcError } = await supabase.rpc(
        "create_event_draft",
        buildCreateEventDraftParams(orgId, title),
      )

      if (rpcError) throw rpcError

      posthog.capture("event_draft_created", { organization_id: orgId })
      router.push(`/orgs/${orgId}/events/${data}/edit?step=basics`)
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : "Failed to create event. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className="flex-1 overflow-auto bg-bg">
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center p-4 sm:p-8">
        <div className="flex w-full max-w-md flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-accent shadow-[var(--shadow-card)]">
              <Icon name="spark" size={20} />
            </span>
            <div className="space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">Event setup · Draft</p>
              <h1 className="text-h1">Create event</h1>
              <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-ink-3">
                Start with a clear event name. Description, category and cover image come next in Basics.
              </p>
            </div>
          </div>

          <Card>
            <CardBody className="p-5 sm:p-6">
              <form onSubmit={createDraft} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <p className="text-h3">Name your event</p>
                  <p className="text-[13px] text-ink-3">This creates a private draft that only your team can see.</p>
                </div>

                <FormField
                  label="Event name"
                  hint="You can refine the name later in Basics."
                  value={title}
                  onChange={(inputEvent) => {
                    setTitle(inputEvent.target.value)
                    if (error) setError("")
                  }}
                  placeholder="e.g. Worship in my Room"
                  disabled={loading}
                  required
                  autoFocus
                />

                {error ? (
                  <div
                    role="alert"
                    className="rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger"
                  >
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={loading || !normalizeEventTitle(title)}
                  variant="primary"
                  size="md"
                  block
                >
                  {loading ? (
                    "Creating draft…"
                  ) : (
                    <>
                      Continue to Basics <Icon name="arrowR" size={14} />
                    </>
                  )}
                </Button>
              </form>
            </CardBody>
          </Card>

          <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            Next · description · category · cover image
          </p>
        </div>
      </div>
    </main>
  )
}
