"use client"

import { useActionState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import type { VenueActionResult } from "@/app/manage/venues/[venueId]/actions"
import type { ManagedVenue } from "@/lib/venues/access"
import { venueRoleLabel, type VenueRole } from "@/lib/venues/core"
import { VENUE_TYPES } from "@/lib/venues/marketplace"

type Action = (prev: VenueActionResult | null, formData: FormData) => Promise<VenueActionResult>

function Result({ state }: { state: VenueActionResult | null }) {
  if (!state) return null
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn("rounded-md px-3 py-2 text-[13px]", state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}
    >
      {state.message}
    </p>
  )
}

export function VenueProfileForm({ venue, action, readOnly }: { venue: ManagedVenue; action: Action; readOnly: boolean }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venue.id} />
      <fieldset disabled={readOnly || pending} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-label">About the venue</span>
          <Textarea
            name="description"
            defaultValue={venue.description ?? ""}
            rows={5}
            maxLength={4000}
            placeholder="What makes it a good place for events: atmosphere, history, what it suits."
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Street address" name="address" defaultValue={venue.address ?? ""} maxLength={300} autoComplete="street-address" />
          <FormField
            label="Capacity"
            name="capacity"
            type="number"
            inputMode="numeric"
            min={1}
            max={200000}
            defaultValue={venue.capacity ?? ""}
            hint="Largest standing or seated audience"
          />
          <label className="flex flex-col gap-1">
            <span className="text-label">Venue type</span>
            <select
              name="venueType"
              defaultValue={venue.venueType ?? ""}
              className="h-[42px] rounded-md border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
            >
              <option value="">Not set</option>
              {Object.entries(VENUE_TYPES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <FormField label="Website" name="website" type="url" defaultValue={venue.website ?? ""} placeholder="https://" maxLength={300} />
          <FormField label="Booking email" name="contactEmail" type="email" defaultValue={venue.contactEmail ?? ""} maxLength={320} />
          <FormField label="Booking phone" name="contactPhone" type="tel" defaultValue={venue.contactPhone ?? ""} maxLength={40} />
        </div>
      </fieldset>
      {readOnly ? (
        <p className="text-[13px] text-ink-3">Staff can view the profile. Ask an owner or manager to change it.</p>
      ) : (
        <div className="flex items-center gap-3">
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      )}
      <Result state={state} />
    </form>
  )
}

export function AddVenueMemberForm({ venueId, roles, action }: { venueId: string; roles: VenueRole[]; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <FormField label="Email on their Ticketiv account" name="email" type="email" required autoComplete="off" />
        <label className="flex flex-col gap-1">
          <span className="text-label">Role</span>
          <select
            name="role"
            defaultValue={roles[roles.length - 1]}
            className="h-[42px] rounded-md border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {venueRoleLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      <Result state={state} />
    </form>
  )
}

export function RemoveVenueMemberButton({
  venueId,
  userId,
  label,
  action,
}: {
  venueId: string
  userId: string
  label: string
  action: Action
}) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : label}
      </Button>
      {state && !state.ok ? (
        <span role="alert" className="text-[12px] text-danger">
          {state.message}
        </span>
      ) : null}
    </form>
  )
}
