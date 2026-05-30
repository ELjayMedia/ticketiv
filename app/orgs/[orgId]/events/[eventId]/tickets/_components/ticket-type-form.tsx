"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FormField } from "@/components/quiet/ui/form"
import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"

interface TicketTypeFormProps {
  orgId: string
  eventId: string
  ticketTypeId?: string
  defaultValues?: {
    name: string
    price_cents: number
    quota: number
    per_user_limit: number | null
  }
}

export function TicketTypeForm({
  orgId,
  eventId,
  ticketTypeId,
  defaultValues,
}: TicketTypeFormProps) {
  const router = useRouter()
  const isEdit = Boolean(ticketTypeId)

  const [name, setName] = useState(defaultValues?.name ?? "")
  const [price, setPrice] = useState(
    defaultValues?.price_cents != null
      ? (defaultValues.price_cents / 100).toFixed(2)
      : ""
  )
  const [quota, setQuota] = useState(
    defaultValues?.quota != null ? String(defaultValues.quota) : ""
  )
  const [perUserLimit, setPerUserLimit] = useState(
    defaultValues?.per_user_limit != null
      ? String(defaultValues.per_user_limit)
      : "1"
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let res: Response

      if (isEdit) {
        res = await fetch(`/api/events/${eventId}/tickets/${ticketTypeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            price: parseFloat(price),
            quota: parseInt(quota, 10),
            per_user_limit: parseInt(perUserLimit, 10) || 0,
          }),
        })
      } else {
        res = await fetch("/api/ticket-types", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: eventId,
            name: name.trim(),
            price_cents: Math.round(parseFloat(price) * 100),
            quota: parseInt(quota, 10),
            per_user_limit: parseInt(perUserLimit, 10) || 0,
            currency: "SZL",
            channels: [],
          }),
        })
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? "Something went wrong.")
        return
      }

      router.push(`/orgs/${orgId}/events/${eventId}/tickets`)
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <Card>
        <CardBody className="flex flex-col gap-4">
          <FormField
            label="Ticket name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. General Admission"
            required
          />
          <FormField
            label="Price (SZL)"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            required
          />
          <FormField
            label="Capacity"
            type="number"
            min="1"
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
            placeholder="100"
            required
          />
          <FormField
            label="Per-buyer limit"
            type="number"
            min="0"
            value={perUserLimit}
            onChange={(e) => setPerUserLimit(e.target.value)}
            hint="0 = unlimited"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
        </CardBody>
      </Card>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create ticket type"}
        </Button>
      </div>
    </form>
  )
}
