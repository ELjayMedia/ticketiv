"use client"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function PoliciesStep({
  eventId,
  onSaving,
}: {
  eventId: string
  onSaving: () => void
}) {
  const [refundPolicy, setRefundPolicy] = useState("")
  const [attendeeFields, setAttendeeFields] = useState("")
  const [confirmationMessage, setConfirmationMessage] = useState("")

  async function save() {
    try {
      onSaving()
      const supabase = createClientSupabaseClient()

      const { error } = await supabase
        .from("events")
        .update({
          refund_policy: refundPolicy,
          attendee_fields: attendeeFields ? attendeeFields.split(",").map((f) => f.trim()) : [],
          confirmation_message: confirmationMessage,
        })
        .eq("id", eventId)

      if (error) throw error
    } catch (err) {
      console.error("[v0] Error saving policies:", err)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Refund policy</label>
        <Textarea
          value={refundPolicy}
          onChange={(e) => setRefundPolicy(e.target.value)}
          onBlur={save}
          placeholder="Describe your refund policy..."
          className="mt-2 h-24"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Attendee fields (comma-separated)</label>
        <input
          type="text"
          value={attendeeFields}
          onChange={(e) => setAttendeeFields(e.target.value)}
          onBlur={save}
          placeholder="e.g. Company, Phone number, Dietary requirements"
          className="mt-2 w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Confirmation message</label>
        <Textarea
          value={confirmationMessage}
          onChange={(e) => setConfirmationMessage(e.target.value)}
          onBlur={save}
          placeholder="Message to show after ticket purchase..."
          className="mt-2 h-24"
        />
      </div>

      <Button onClick={save} className="w-full">
        Save policies
      </Button>
    </div>
  )
}
