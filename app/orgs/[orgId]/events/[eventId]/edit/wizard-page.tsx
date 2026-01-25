1) What you’re building
Routes

Create: /orgs/[orgId]/events/new → Step 1 creates a draft and returns eventId

Wizard: /orgs/[orgId]/events/[eventId]/edit with ?step=basics|venue|tickets|policies|publish

Realtime subscription goal

While the user is in the wizard, subscribe to updates on that event row so:

If another staff member edits the event, you see it

If your own updates happen from another tab, it stays in sync

“Saved ✓” can reflect real DB updates

2) Supabase prerequisites (quick checks)
A) Realtime enabled for events

In Supabase dashboard:

Database → Replication → ensure events is enabled for realtime (or “Full Realtime” toggles depending on UI).

B) RLS matters

Realtime Postgres changes respect RLS. If user can’t SELECT the row, they won’t receive changes.
Your policies already allow org members/event staff to SELECT, so you’re good.

3) Wizard structure in v0 (recommended file layout)

Create these components/pages in v0:

app/orgs/[orgId]/events/new/page.tsx

UI for “Event title”

Calls rpc('create_event_draft')

Redirects to edit wizard

app/orgs/[orgId]/events/[eventId]/edit/page.tsx

Wizard shell: step nav + content panel

Loads initial event

Sets up realtime subscription

Renders step components

components/event-wizard/event-realtime.ts

Hook that subscribes to events changes

components/event-wizard/steps/*

BasicsStep.tsx

VenueStep.tsx

TicketsStep.tsx

PoliciesStep.tsx

PublishStep.tsx

4) Realtime subscription hook (Postgres changes)

Create a client hook like this:

// components/event-wizard/use-event-realtime.ts
"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/browser-helpers"

type UseEventRealtimeArgs = {
  eventId: string
  onChange: (payload: any) => void
}

export function useEventRealtime({ eventId, onChange }: UseEventRealtimeArgs) {
  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`events:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          onChange(payload)
        }
      )
      .subscribe((status) => {
        // optional: console.log("Realtime status:", status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, onChange])
}

How to use it

On change, update your wizard state with the new event row.

5) Wizard page example (edit page)

This is the pattern that works well in v0:

// app/orgs/[orgId]/events/[eventId]/edit/page.tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-helpers"
import { usePermissions } from "@/lib/providers/permissions-provider"
import { useEventRealtime } from "@/components/event-wizard/use-event-realtime"
import { NoAccessEmptyState } from "@/components/no-access-empty-state"

import { BasicsStep } from "@/components/event-wizard/steps/BasicsStep"
import { VenueStep } from "@/components/event-wizard/steps/VenueStep"
import { TicketsStep } from "@/components/event-wizard/steps/TicketsStep"
import { PoliciesStep } from "@/components/event-wizard/steps/PoliciesStep"
import { PublishStep } from "@/components/event-wizard/steps/PublishStep"

type EventRow = {
  id: string
  org_id: string
  title: string | null
  status: string | null
  visibility: string | null
  // add fields you actually use
}

const steps = ["basics", "venue", "tickets", "policies", "publish"] as const
type Step = (typeof steps)[number]

export default function EventEditWizardPage() {
  const router = useRouter()
  const params = useParams<{ orgId: string; eventId: string }>()
  const searchParams = useSearchParams()

  const orgId = params.orgId
  const eventId = params.eventId
  const step = (searchParams.get("step") as Step) || "basics"

  const { canAccessOrg, isReady } = usePermissions()

  const [event, setEvent] = useState<EventRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  // 1) Initial load
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from("events")
        .select("id, org_id, title, status, visibility")
        .eq("id", eventId)
        .single()

      if (cancelled) return
      if (error) {
        setEvent(null)
        setLoading(false)
        return
      }
      setEvent(data)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [eventId])

  // 2) Subscribe to DB changes for this event
  const onRealtimeChange = useCallback((payload: any) => {
    // payload.new is available for UPDATE/INSERT; payload.old for DELETE
    if (payload?.eventType === "UPDATE" || payload?.eventType === "INSERT") {
      setEvent((prev) => ({ ...(prev || {}), ...(payload.new || {}) }))
      setSaveState("saved")
      // optional: revert to idle after a bit
      setTimeout(() => setSaveState("idle"), 1200)
    }
  }, [])

  useEventRealtime({ eventId, onChange: onRealtimeChange })

  // Permission gate (org scoped)
  if (isReady && !canAccessOrg(orgId)) {
    return <NoAccessEmptyState title="No access" description="You don’t have permission to manage this organization." />
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!event) return <NoAccessEmptyState title="Event not found" description="This event may not exist or you don’t have access." />

  const setStep = (next: Step) => {
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=${next}`)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{event.title || "Untitled event"}</h1>
          <p className="text-sm text-muted-foreground">
            Status: {event.status || "draft"} • {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved ✓" : ""}
          </p>
        </div>
      </div>

      {/* Step navigation */}
      <div className="flex gap-2 flex-wrap">
        {steps.map((s) => (
          <button
            key={s}
            className={`px-3 py-2 rounded-lg text-sm ${s === step ? "bg-black text-white" : "bg-muted"}`}
            onClick={() => setStep(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border p-4">
        {step === "basics" && (
          <BasicsStep
            event={event}
            onSaving={() => setSaveState("saving")}
            onError={() => setSaveState("error")}
          />
        )}
        {step === "venue" && <VenueStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "tickets" && <TicketsStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "policies" && <PoliciesStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "publish" && <PublishStep event={event} onSaving={() => setSaveState("saving")} />}
      </div>
    </div>
  )
}

6) Step component pattern (Basics example)

When you update, just do a normal update call. Realtime will echo the change back.

// components/event-wizard/steps/BasicsStep.tsx
"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/browser-helpers"

export function BasicsStep({
  event,
  onSaving,
  onError,
}: {
  event: any
  onSaving: () => void
  onError: () => void
}) {
  const [title, setTitle] = useState(event.title ?? "")

  async function save() {
    try {
      onSaving()
      const { error } = await supabase
        .from("events")
        .update({ title })
        .eq("id", event.id)

      if (error) throw error
      // no need to set local event here; realtime will update it
    } catch {
      onError()
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium">Event title</label>
        <input
          className="mt-1 w-full rounded-lg border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={save} // autosave on blur
          placeholder="Makoti Festival 2026"
        />
      </div>
      <button className="rounded-lg bg-black text-white px-3 py-2" onClick={save}>
        Save
      </button>
    </div>
  )
}

7) Create draft page (Step 1 “New Event”)

Use your RPC (recommended) so creator auto-becomes event_staff:

// app/orgs/[orgId]/events/new/page.tsx
"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/browser-helpers"

export default function NewEventPage() {
  const router = useRouter()
  const params = useParams<{ orgId: string }>()
  const orgId = params.orgId

  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)

  async function createDraft() {
    setLoading(true)
    const { data, error } = await supabase.rpc("create_event_draft", {
      p_org_id: orgId,
      p_title: title || "Untitled event",
      p_visibility: "private",
    })

    setLoading(false)
    if (error) return alert(error.message)

    const eventId = data
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=basics`)
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Create event</h1>

      <div>
        <label className="text-sm font-medium">Event name</label>
        <input
          className="mt-1 w-full rounded-lg border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Business Expo 2026"
        />
      </div>

      <button
        className="rounded-lg bg-black text-white px-3 py-2 disabled:opacity-50"
        disabled={loading}
        onClick={createDraft}
      >
        {loading ? "Creating..." : "Create draft"}
      </button>
    </div>
  )
}

8) Important: avoid “realtime echo loops”

If you also set local state on save and listen to realtime, you can get duplicate “Saved” flickers. The clean pattern is:

On save: set saveState = saving

Don’t manually mutate event state

Let realtime update event

On realtime update: set saveState = saved

That’s what the earlier code does.
