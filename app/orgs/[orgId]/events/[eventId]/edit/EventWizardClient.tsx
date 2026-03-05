✅ The file app/orgs/[orgId]/events/[eventId]/edit/wizard-page.tsx is not valid TypeScript/React

It contains plain English documentation text starting at line 1:

1) What you’re building
Routes
Create: /orgs/[orgId]/events/new → ...


Because it’s a .tsx file, Next.js/TypeScript tries to compile it as code and your build/dev server will fail with a syntax error.

That’s what you’re “getting wrong”.

Fix (fastest)
Option A (recommended): Delete the file

If you’re not importing it anywhere, just remove it:

Delete:
app/orgs/[orgId]/events/[eventId]/edit/wizard-page.tsx

and put that content in a doc instead:

Move it to:
docs/event-wizard.md

✅ This will immediately stop compilation errors.

Fix (proper wizard integration + realtime)

Right now your real page is:

app/orgs/[orgId]/events/[eventId]/edit/page.tsx (server component)

And you already have the realtime hook in:

hooks/use-event-realtime.ts ✅ (this is correct)

What’s missing:

You haven’t actually mounted a client wizard component that uses that hook.

Because realtime subscriptions must run in a client component ("use client"), you can’t do it inside the server page.

The clean pattern
1) Keep page.tsx as server (auth + permission check), then render a client wizard

Create:

app/orgs/[orgId]/events/[eventId]/edit/EventWizardClient.tsx

"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { useEventRealtime } from "@/hooks/use-event-realtime"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

import { BasicsStep } from "@/components/event-wizard/steps/BasicsStep"
import { VenueStep } from "@/components/event-wizard/steps/VenueStep"
import { TicketsStep } from "@/components/event-wizard/steps/TicketsStep"
import { PoliciesStep } from "@/components/event-wizard/steps/PoliciesStep"
import { PublishStep } from "@/components/event-wizard/steps/PublishStep"

const steps = ["basics", "venue", "tickets", "policies", "publish"] as const

export default function EventWizardClient({
  orgId,
  eventId,
  initialEvent,
}: {
  orgId: string
  eventId: string
  initialEvent?: any
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const step = searchParams.get("step") ?? "basics"

  const [event, setEvent] = useState<any>(initialEvent || null)
  const [loading, setLoading] = useState(!initialEvent)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [wasPublished, setWasPublished] = useState(initialEvent?.status === "published")

  // Initial load (client)
  useEffect(() => {
    if (initialEvent) return // Skip if we have initial data from server

    let cancelled = false
    async function load() {
      setLoading(true)
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("org_id", orgId)
        .single()

      if (!cancelled) {
        if (error) setEvent(null)
        else {
          setEvent(data)
          setWasPublished(data?.status === "published")
        }
        setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [orgId, eventId, initialEvent])

  // Realtime merge
  const onRealtimeChange = useCallback(
    (payload: any) => {
      if (payload?.eventType === "UPDATE" || payload?.eventType === "INSERT") {
        const newEvent = { ...(event ?? {}), ...(payload.new ?? {}) }

        // Detect publish status change and show toast
        if (event?.status !== "published" && newEvent.status === "published" && !wasPublished) {
          toast({
            title: "Event published!",
            description: "Your event is now visible to everyone — even without an account.",
            duration: 5000,
          })
          setWasPublished(true)
        }

        setEvent(newEvent)
        setSaveState("saved")
        setTimeout(() => setSaveState("idle"), 1000)
      }
    },
    [event, wasPublished, toast]
  )

  useEventRealtime({ eventId, onChange: onRealtimeChange })

  function go(nextStep: string) {
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=${nextStep}`)
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!event) return <div className="p-6">No access or event not found.</div>

  const isDraft = event?.status === "draft"

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-xl font-semibold">{event.title ?? "Untitled event"}</h1>
            {isDraft && <Badge variant="outline">Draft</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {steps.map((s) => (
          <button
            key={s}
            onClick={() => go(s)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              s === step
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="border rounded-xl p-4">
        {step === "basics" && (
          <BasicsStep event={event} onSaving={() => setSaveState("saving")} onError={() => setSaveState("error")} />
        )}
        {step === "venue" && <VenueStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "tickets" && <TicketsStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "policies" && <PoliciesStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "publish" && (
          <PublishStep
            event={event}
            onSaving={() => setSaveState("saving")}
            onPublish={() => {
              // Toast is already shown in realtime listener
            }}
          />
        )}
      </div>
    </div>
  )
}

2) Update your existing server page to render it

In app/orgs/[orgId]/events/[eventId]/edit/page.tsx, after you verify session/access, return:

import EventWizardClient from "./EventWizardClient"

export default async function EventEditPage({ params }: { params: { orgId: string; eventId: string } }) {
  // keep your auth/session checks here...

  return <EventWizardClient orgId={params.orgId} eventId={params.eventId} />
}

One more important thing

Your repo currently has BOTH:

old editor UI in edit/page.tsx (server form)

wizard text accidentally in wizard-page.tsx

So you need to choose:

✅ Use the wizard approach above and remove the old form
OR
✅ Keep the old editor and don’t add realtime wizard yet

Quick check: what error are you seeing?
