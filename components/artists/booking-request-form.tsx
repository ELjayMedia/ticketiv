"use client"

import { useActionState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import { ResultNote } from "@/components/venues/marketplace-forms"

type Result = { ok: boolean; message: string }
type Action = (prev: Result | null, formData: FormData) => Promise<Result>

const SELECT = "h-[42px] rounded-md border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

/** "Request booking" on a claimed artist's profile (TICK-461). */
export function BookingRequestForm({
  artistId,
  orgs,
  events,
  action,
}: {
  artistId: string
  orgs: Array<{ id: string; name: string }>
  events: Array<{ id: string; orgId: string; title: string }>
  action: Action
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const orgName = new Map(orgs.map((o) => [o.id, o.name]))
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="artistId" value={artistId} />
      <fieldset disabled={pending} className="flex flex-col gap-3">
        {orgs.length > 1 ? (
          <label className="flex flex-col gap-1">
            <span className="text-label">For</span>
            <select name="orgId" defaultValue={orgs[0].id} className={SELECT}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="orgId" value={orgs[0]?.id ?? ""} />
        )}
        {events.length > 0 ? (
          <label className="flex flex-col gap-1">
            <span className="text-label">Event</span>
            <select name="eventId" defaultValue="" className={SELECT}>
              <option value="">A new event (name it below)</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {orgs.length > 1 ? `${orgName.get(e.orgId) ?? ""} · ` : ""}
                  {e.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <FormField label="Event name" name="eventTitle" maxLength={200} hint={events.length > 0 ? "Leave blank when you pick an event above" : undefined} />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Date" name="date" type="date" required />
          <FormField label="Set time" name="time" type="time" required defaultValue="20:00" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Town or city" name="city" maxLength={80} />
          <FormField label="Set length (minutes)" name="setMinutes" type="number" inputMode="numeric" min={5} max={720} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Offer from (SZL)" name="offerMin" inputMode="decimal" />
          <FormField label="Offer up to (SZL)" name="offerMax" inputMode="decimal" />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label">Message</span>
          <Textarea name="message" rows={4} required minLength={10} maxLength={4000} placeholder="The event, the audience, and what you'd like them to play." />
        </label>
      </fieldset>
      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Sending…" : "Send booking request"}
        </Button>
      </div>
      <p className="text-[12px] text-ink-3">Only you, your team and the artist&apos;s team can see the request.</p>
      <ResultNote state={state} />
    </form>
  )
}
