"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ProviderOption {
  id: string
  label: string
  sub: string
  enabled: boolean
  operational: boolean
  warning: string | null
}

export function PoliciesStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [refundPolicy, setRefundPolicy] = useState("")
  const [attendeeFields, setAttendeeFields] = useState("")
  const [confirmationMessage, setConfirmationMessage] = useState("")
  const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([])
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function toggleProvider(option: ProviderOption) {
    setSelectedProviders((current) => {
      const selected = current.includes(option.id)
      if (!selected && (!option.enabled || !option.operational)) return current
      return selected ? current.filter((provider) => provider !== option.id) : [...current, option.id]
    })
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
      setProviderOptions(Array.isArray(payload.providerOptions) ? payload.providerOptions : [])
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
      if (Array.isArray(payload.providerOptions)) setProviderOptions(payload.providerOptions)
    } catch (err: any) {
      console.error("[v0] Error saving policies:", err)
      setError(err?.message || "Failed to save policies")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading policies...</div>

  const selectedUnavailable = providerOptions.filter(
    (option) => selectedProviders.includes(option.id) && (!option.enabled || !option.operational),
  )

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
        <label className="text-sm font-medium">Payment methods accepted for this event</label>
        <p className="mt-1 text-xs text-muted-foreground">
          Only Ticketiv-supported methods appear here. Leave every option unselected to accept all currently enabled methods.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          {providerOptions.length === 0 ? (
            <span className="text-xs text-muted-foreground">No Ticketiv payment methods are currently configured.</span>
          ) : (
            providerOptions.map((option) => {
              const active = selectedProviders.includes(option.id)
              const unavailable = !option.enabled || !option.operational
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggleProvider(option)}
                  disabled={saving}
                  aria-pressed={active}
                  className={
                    "rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-60 " +
                    (active
                      ? unavailable
                        ? "border-amber-500 bg-amber-50"
                        : "border-ink bg-ink text-surface"
                      : unavailable
                        ? "border-line bg-muted/40 text-muted-foreground"
                        : "border-line-2 bg-surface text-ink hover:border-ink")
                  }
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{option.label}</span>
                    {unavailable && (
                      <span className="rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[10px] font-medium uppercase text-amber-800">
                        Not operational
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs opacity-75">{option.sub}</span>
                  {option.warning && <span className="mt-1 block text-xs text-amber-700">{option.warning}</span>}
                </button>
              )
            })
          )}
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {selectedProviders.length === 0
            ? "Accept all currently enabled methods."
            : `Buyers will be offered: ${selectedProviders
                .map((provider) => providerOptions.find((option) => option.id === provider)?.label ?? provider)
                .join(", ")}.`}
        </p>
        {selectedUnavailable.length > 0 && (
          <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Remove the non-operational method before saving, or ask Ticketiv platform administration to complete its configuration.
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button onClick={save} disabled={saving || selectedUnavailable.length > 0} className="w-full">
        {saving ? "Saving policies..." : "Save policies"}
      </Button>
    </div>
  )
}
