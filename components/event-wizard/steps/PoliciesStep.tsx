"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const PROVIDER_LABELS: Record<string, string> = {
  paystack: "Card / bank (Paystack)",
  momo: "MTN MoMo",
  flutterwave: "Flutterwave",
  manual: "Manual / cash",
}

export function PoliciesStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [refundPolicy, setRefundPolicy] = useState("")
  const [attendeeFields, setAttendeeFields] = useState("")
  const [confirmationMessage, setConfirmationMessage] = useState("")
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function toggleProvider(p: string) {
    setSelectedProviders((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]))
  }

  useEffect(() => {
    loadPolicies()
  }, [eventId])

  async function loadPolicies() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/policies`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load policies")
      setRefundPolicy(payload.event?.refund_policy ?? "")
      setAttendeeFields(Array.isArray(payload.event?.attendee_fields) ? payload.event.attendee_fields.join(", ") : "")
      setConfirmationMessage(payload.event?.confirmation_message ?? "")
      setAvailableProviders(Array.isArray(payload.availableProviders) ? payload.availableProviders : [])
      setSelectedProviders(Array.isArray(payload.event?.payment_providers) ? payload.event.payment_providers : [])
    } catch (err: any) {
      console.error("[v0] Error loading policies:", err)
      setError(err?.message || "Failed to load policies")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    try {
      setSaving(true)
      setError("")
      onSaving()
      const response = await fetch(`/api/events/${eventId}/policies`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refund_policy: refundPolicy, attendee_fields: attendeeFields, confirmation_message: confirmationMessage, payment_providers: selectedProviders }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to save policies")
      setRefundPolicy(payload.event?.refund_policy ?? "")
      setAttendeeFields(Array.isArray(payload.event?.attendee_fields) ? payload.event.attendee_fields.join(", ") : "")
      setConfirmationMessage(payload.event?.confirmation_message ?? "")
      if (Array.isArray(payload.event?.payment_providers)) setSelectedProviders(payload.event.payment_providers)
    } catch (err: any) {
      console.error("[v0] Error saving policies:", err)
      setError(err?.message || "Failed to save policies")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading policies...</div>

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Refund policy</label>
        <Textarea value={refundPolicy} onChange={(e) => setRefundPolicy(e.target.value)} placeholder="Describe your refund policy..." className="mt-2 h-24" disabled={saving} />
      </div>

      <div>
        <label className="text-sm font-medium">Attendee fields</label>
        <Input value={attendeeFields} onChange={(e) => setAttendeeFields(e.target.value)} placeholder="Company, Phone number, Dietary requirements" className="mt-2" disabled={saving} />
        <p className="mt-1 text-xs text-muted-foreground">Separate each field with a comma.</p>
      </div>

      <div>
        <label className="text-sm font-medium">Confirmation message</label>
        <Textarea value={confirmationMessage} onChange={(e) => setConfirmationMessage(e.target.value)} placeholder="Message to show after ticket purchase..." className="mt-2 h-24" disabled={saving} />
      </div>

      <div>
        <label className="text-sm font-medium">Payment providers</label>
        <p className="mt-1 text-xs text-muted-foreground">
          Lock this event to specific payment platforms. Leave all unselected to accept every available provider.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {availableProviders.length === 0 ? (
            <span className="text-xs text-muted-foreground">No payment providers are currently available.</span>
          ) : (
            availableProviders.map((p) => {
              const active = selectedProviders.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => toggleProvider(p)}
                  disabled={saving}
                  aria-pressed={active}
                  className={
                    "rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60 " +
                    (active
                      ? "border-ink bg-ink text-surface"
                      : "border-line-2 bg-surface text-ink hover:border-ink")
                  }
                >
                  {PROVIDER_LABELS[p] ?? p}
                </button>
              )
            })
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {selectedProviders.length === 0
            ? "Accepting all available providers."
            : `Locked to: ${selectedProviders.map((p) => PROVIDER_LABELS[p] ?? p).join(", ")}.`}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={save} disabled={saving} className="w-full">
        {saving ? "Saving policies..." : "Save policies"}
      </Button>
    </div>
  )
}
