"use client"

import { useActionState, type ReactNode } from "react"

import { Button } from "@/components/quiet/ui/button"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import { cn } from "@/lib/cn"
import { ACCESSIBILITY, AMENITIES, RATE_UNITS } from "@/lib/venues/marketplace"
import type { VenueSpace } from "@/lib/venues/marketplace-data"

type Result = { ok: boolean; message: string }
type Action = (prev: Result | null, formData: FormData) => Promise<Result>

const SELECT =
  "h-[42px] rounded-md border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"

export function ResultNote({ state }: { state: Result | null }) {
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

/** A small form posting hidden fields (plus any children) to a server action. */
export function ActionForm({
  action,
  hidden,
  submitLabel,
  pendingLabel = "Working…",
  variant = "outline",
  children,
  className,
  confirm,
}: {
  action: Action
  hidden: Record<string, string>
  submitLabel: string
  pendingLabel?: string
  variant?: "accent" | "primary" | "outline" | "ghost"
  children?: ReactNode
  className?: string
  confirm?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form
      action={formAction}
      className={cn("flex flex-col gap-3", className)}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <div>
        <Button type="submit" variant={variant} size="sm" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
      <ResultNote state={state} />
    </form>
  )
}

function CheckboxGroup({ legend, name, options, selected }: { legend: string; name: string; options: Record<string, string>; selected: string[] }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label mb-1">{legend}</legend>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {Object.entries(options).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-[13px] text-ink-2">
            <input type="checkbox" name={name} value={key} defaultChecked={selected.includes(key)} className="h-4 w-4 accent-[var(--accent)]" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function SpaceForm({ venueId, space, action }: { venueId: string; space?: VenueSpace; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="venueId" value={venueId} />
      {space ? <input type="hidden" name="spaceId" value={space.id} /> : null}
      <fieldset disabled={pending} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Name" name="name" required minLength={2} maxLength={80} defaultValue={space?.name ?? ""} placeholder="Main hall" />
          <FormField label="Standing capacity" name="capacityStanding" type="number" inputMode="numeric" min={1} max={200000} defaultValue={space?.capacityStanding ?? ""} />
          <FormField label="Seated capacity" name="capacitySeated" type="number" inputMode="numeric" min={1} max={200000} defaultValue={space?.capacitySeated ?? ""} />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label">Description</span>
          <Textarea name="description" rows={3} maxLength={2000} defaultValue={space?.description ?? ""} placeholder="Layout, stage size, load-in, what it suits." />
        </label>
        <CheckboxGroup legend="Amenities" name="amenities" options={AMENITIES} selected={space?.amenities ?? []} />
        <CheckboxGroup legend="Accessibility" name="accessibility" options={ACCESSIBILITY} selected={space?.accessibility ?? []} />
        <label className="flex flex-col gap-1">
          <span className="text-label">Photo links</span>
          <Textarea
            name="imageUrls"
            rows={2}
            defaultValue={(space?.imageUrls ?? []).join("\n")}
            placeholder="One https:// link per line, up to 8"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <FormField
            label="Indicative rate (SZL)"
            name="rate"
            inputMode="decimal"
            defaultValue={space?.rateCents != null ? String(space.rateCents / 100) : ""}
            hint="A guide price. Contracts and payment are agreed with the organiser directly."
          />
          <label className="flex flex-col gap-1">
            <span className="text-label">Per</span>
            <select name="rateUnit" defaultValue={space?.rateUnit ?? "day"} className={SELECT}>
              {Object.entries(RATE_UNITS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label.replace("per ", "")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <FormField label="Rate note" name="rateNote" maxLength={300} defaultValue={space?.rateNote ?? ""} placeholder="e.g. Includes cleaning and security" />
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" name="isPublic" defaultChecked={space?.isPublic ?? true} className="h-4 w-4 accent-[var(--accent)]" />
          Show this space on the public venue page
        </label>
      </fieldset>
      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : space ? "Save space" : "Add space"}
        </Button>
      </div>
      <ResultNote state={state} />
    </form>
  )
}

export function BlockForm({ venueId, spaces, action }: { venueId: string; spaces: Array<{ id: string; name: string }>; action: Action }) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="venueId" value={venueId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <FormField label="From" name="fromDate" type="date" required />
        <FormField label="To (inclusive)" name="toDate" type="date" />
        <label className="flex flex-col gap-1">
          <span className="text-label">What</span>
          <select name="spaceId" defaultValue="" className={SELECT}>
            <option value="">Whole venue</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <FormField label="Note (only your team sees it)" name="note" maxLength={300} placeholder="Maintenance, private function…" />
      <div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Blocking…" : "Block dates"}
        </Button>
      </div>
      <ResultNote state={state} />
    </form>
  )
}

export function EnquiryForm({
  venueId,
  venueSlug,
  orgs,
  spaces,
  action,
}: {
  venueId: string
  venueSlug: string
  orgs: Array<{ id: string; name: string }>
  spaces: Array<{ id: string; name: string }>
  action: Action
}) {
  const [state, formAction, pending] = useActionState(action, null)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="venueId" value={venueId} />
      <input type="hidden" name="venueSlug" value={venueSlug} />
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
        {spaces.length > 0 ? (
          <label className="flex flex-col gap-1">
            <span className="text-label">Space</span>
            <select name="spaceId" defaultValue="" className={SELECT}>
              <option value="">Whole venue</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <FormField label="Date" name="date" type="date" required />
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start" name="startTime" type="time" required defaultValue="18:00" />
          <FormField label="End" name="endTime" type="time" required defaultValue="23:00" hint="Earlier than the start means the next day" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Expected attendance" name="attendance" type="number" inputMode="numeric" min={1} max={200000} />
          <FormField label="Budget (SZL)" name="budget" inputMode="decimal" />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label">Message</span>
          <Textarea name="message" rows={4} required minLength={10} maxLength={4000} placeholder="What's the event, and what do you need from the venue?" />
        </label>
      </fieldset>
      <div>
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Sending…" : "Send booking request"}
        </Button>
      </div>
      <p className="text-[12px] text-ink-3">Only you, your organisation's team and the venue's team can see the enquiry.</p>
      <ResultNote state={state} />
    </form>
  )
}
