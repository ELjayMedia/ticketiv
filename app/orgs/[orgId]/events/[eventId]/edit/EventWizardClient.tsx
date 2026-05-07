"use client"

import { useCallback, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { useEventRealtime } from "@/hooks/use-event-realtime"

import { BasicsStep } from "@/components/event-wizard/steps/BasicsStep"
import { VenueStep } from "@/components/event-wizard/steps/VenueStep"
import { TicketsStep } from "@/components/event-wizard/steps/TicketsStep"
import { PoliciesStep } from "@/components/event-wizard/steps/PoliciesStep"
import { PublishStep } from "@/components/event-wizard/steps/PublishStep"

const steps = ["basics","venue","tickets","policies","publish"] as const

export default function EventWizardClient({ orgId, eventId }: { orgId: string; eventId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = searchParams.get("step") ?? "basics"

  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<"idle"|"saving"|"saved"|"error">("idle")

  // initial load (client)
  useEffect(() => {
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
        else setEvent(data)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [orgId, eventId])

  // realtime merge
  const onRealtimeChange = useCallback((payload: any) => {
    if (payload?.eventType === "UPDATE" || payload?.eventType === "INSERT") {
      setEvent((prev: any) => ({ ...(prev ?? {}), ...(payload.new ?? {}) }))
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1000)
    }
  }, [])

  useEventRealtime({ eventId, onChange: onRealtimeChange })

  function go(next: string) {
    router.push(`/orgs/${orgId}/events/${eventId}/edit?step=${next}`)
  }

  if (loading) return <div className="p-6">Loading…</div>
  if (!event) return <div className="p-6">No access or event not found.</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{event.title ?? "Untitled event"}</h1>
          <p className="text-sm text-muted-foreground">
            Status: {event.status ?? "draft"} {saveState === "saving" ? "• Saving…" : saveState === "saved" ? "• Saved ✓" : ""}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {steps.map(s => (
          <button key={s} onClick={() => go(s)} className={`px-3 py-2 rounded-lg text-sm ${s===step ? "bg-black text-white" : "bg-muted"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="border rounded-xl p-4">
        {step === "basics" && <BasicsStep event={event} onSaving={() => setSaveState("saving")} onError={() => setSaveState("error")} />}
        {step === "venue" && <VenueStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "tickets" && <TicketsStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "policies" && <PoliciesStep eventId={eventId} onSaving={() => setSaveState("saving")} />}
        {step === "publish" && <PublishStep event={event} onSaving={() => setSaveState("saving")} />}
      </div>
    </div>
  )
}
