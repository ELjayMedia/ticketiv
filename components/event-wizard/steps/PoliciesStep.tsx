"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

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
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to load payments and policies")
      setRefundPolicy(payload.event?.refund_policy ?? "")
      setAttendeeFields(Array.isArray(payload.event?.attendee_fields) ? payload.event.attendee_fields.join(", ") : "")
      setConfirmationMessage(payload.event?.confirmation_message ?? "")
      setProviderOptions(Array.isArray(payload.providerOptions) ? payload.providerOptions : [])
      setSelectedProviders(Array.isArray(payload.event?.payment_providers) ? payload.event.payment_providers : [])
    } catch (loadError: any) {
      console.error("[event-wizard] Error loading payments and policies:", loadError)
      setError(loadError?.message || "Failed to load payments and policies")
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
        body: JSON.stringify({
          refund_policy: refundPolicy,
          attendee_fields: attendeeFields,
          confirmation_message: confirmationMessage,
          payment_providers: selectedProviders,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Failed to save payments and policies")
      setRefundPolicy(payload.event?.refund_policy ?? "")
      setAttendeeFields(Array.isArray(payload.event?.attendee_fields) ? payload.event.attendee_fields.join(", ") : "")
      setConfirmationMessage(payload.event?.confirmation_message ?? "")
      if (Array.isArray(payload.event?.payment_providers)) setSelectedProviders(payload.event.payment_providers)
      if (Array.isArray(payload.providerOptions)) setProviderOptions(payload.providerOptions)
    } catch (saveError: any) {
      console.error("[event-wizard] Error saving payments and policies:", saveError)
      setError(saveError?.message || "Failed to save payments and policies")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading payments and policies…</div>

  const selectedUnavailable = providerOptions.filter(
    (option) => selectedProviders.includes(option.id) && (!option.enabled || !option.operational),
  )
  const operationalOptions = providerOptions.filter((option) => option.enabled && option.operational)
  const hasBuyerPolicy = refundPolicy.trim().length > 0 || confirmationMessage.trim().length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Payments & buyer policies</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how buyers can pay and define what they should expect after purchase.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h3 className="font-medium">Payment methods</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Only Ticketiv-supported methods appear here. Leave every option unselected to accept all operational methods.
          </p>
        </div>

        {operationalOptions.length === 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">No operational payment method is available</p>
            <p className="mt-1 text-xs leading-relaxed">
              You can still publish this event, but paid ticket sales will stay unavailable until Ticketiv has an operational method for this currency.
            </p>
            <Link href="/support" className="mt-2 inline-flex text-xs font-medium underline underline-offset-4">
              Contact Ticketiv support
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
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
                  disabled={saving || (unavailable && !active)}
                  aria-pressed={active}
                  className={
                    "rounded-lg border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
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
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase">
                      {active && unavailable ? "Remove" : unavailable ? "Not operational" : active ? "Selected" : "Available"}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs opacity-75">{option.sub}</span>
                  {option.warning ? <span className="mt-1 block text-xs text-amber-700">{option.warning}</span> : null}
                </button>
              )
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {selectedProviders.length === 0
            ? operationalOptions.length > 0
              ? `All operational methods will be offered: ${operationalOptions.map((option) => option.label).join(", ")}.`
              : "You can publish now. Paid checkout will remain unavailable until the platform has an operational method."
            : `Buyers will be offered: ${selectedProviders
                .map((provider) => providerOptions.find((option) => option.id === provider)?.label ?? provider)
                .join(", ")}.`}
        </p>

        {selectedUnavailable.length > 0 ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Remove the non-operational method before saving, or ask Ticketiv platform administration to complete its configuration.
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h3 className="font-medium">Refund or support policy *</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a refund policy, a confirmation message, or both. At least one is required for publication.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Refund policy</label>
          <Textarea
            value={refundPolicy}
            onChange={(inputEvent) => setRefundPolicy(inputEvent.target.value)}
            placeholder="Explain whether refunds are allowed, the deadline and how buyers request one."
            className="mt-2 h-28"
            disabled={saving}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Confirmation message</label>
          <Textarea
            value={confirmationMessage}
            onChange={(inputEvent) => setConfirmationMessage(inputEvent.target.value)}
            placeholder="Share arrival instructions, support contacts or what happens after purchase."
            className="mt-2 h-28"
            disabled={saving}
          />
        </div>

        <p className={hasBuyerPolicy ? "text-xs text-emerald-700" : "text-xs text-amber-700"}>
          {hasBuyerPolicy ? "Buyer policy requirement is complete." : "Add a refund policy or confirmation message to complete this requirement."}
        </p>
      </section>

      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <label className="text-sm font-medium">Additional attendee fields</label>
          <Input
            value={attendeeFields}
            onChange={(inputEvent) => setAttendeeFields(inputEvent.target.value)}
            placeholder="Company, Phone number, Dietary requirements"
            className="mt-2"
            disabled={saving}
          />
          <p className="mt-1 text-xs text-muted-foreground">Separate each field with a comma.</p>
        </div>
      </section>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button onClick={save} disabled={saving || selectedUnavailable.length > 0} className="w-full">
        {saving ? "Saving payments & policies…" : "Save payments & policies"}
      </Button>
    </div>
  )
}
