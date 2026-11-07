"use client"

import * as React from "react"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Input, Label, Textarea } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"

import { addHighlightAction, hideUpdateAction, postUpdateAction, removeHighlightAction, saveGuideAction, type GuideActionState } from "./actions"

export interface GuideFormValues {
  doors: string
  entrance: string
  gettingThere: string
  parking: string
  ageRule: string
  paymentNote: string
  whatToBring: string
  houseRules: string
  helpContact: string
  programme: Array<{ time: string; title: string; where: string }>
  facilities: Array<{ label: string; detail: string }>
}

export interface GuideUpdateRow {
  id: string
  title: string
  body: string | null
  notified: boolean
  whenLabel: string
  hiddenReason: string | null
  hidden: boolean
}

const INITIAL: GuideActionState = { ok: false, message: null }

function Notice({ state }: { state: GuideActionState }) {
  if (!state.message) return null
  return (
    <div
      role="status"
      className={
        "rounded-[var(--radius)] px-3 py-2.5 text-[13px] " +
        (state.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")
      }
    >
      <p className="font-semibold">{state.message}</p>
      {state.errors?.length ? (
        <ul className="mt-1 list-disc pl-5 font-mono text-[11px]">
          {state.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label">{label}</span>
      {children}
      {hint ? <span className="font-mono text-[11px] text-ink-3">{hint}</span> : null}
    </label>
  )
}

/** Small phone preview of what ticket holders see on the day. */
function Preview({ title, values }: { title: string; values: GuideFormValues }) {
  const programme = values.programme.filter((p) => p.time && p.title)
  const facts = [
    values.ageRule ? ["Ages", values.ageRule] : null,
    values.paymentNote ? ["Payment", values.paymentNote] : null,
    ...values.facilities.filter((f) => f.label && f.detail).map((f) => [f.label, f.detail]),
  ].filter(Boolean) as string[][]
  return (
    <div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[32px] border-[8px] border-ink bg-bg shadow-[var(--shadow-elev)]">
      <div className="flex max-h-[560px] flex-col gap-3 overflow-y-auto p-3.5">
        <div>
          <span className="text-label">My tickets</span>
          <p className="text-[18px] font-semibold leading-tight tracking-[-0.02em]">{title}</p>
        </div>
        <div className="flex items-center gap-3 rounded-[16px] border border-line bg-surface p-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] bg-surface-2 text-ink-3">
            <Icon name="qr" size={28} />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Chip variant="accent" size="sm" className="self-start">
              Valid for entry
            </Chip>
            {values.entrance ? (
              <span className="text-[12px]">
                <span className="text-label">Show at</span> <b className="block truncate">{values.entrance}</b>
              </span>
            ) : null}
            {values.doors ? (
              <span className="text-[12px]">
                <span className="text-label">Doors</span> <b className="block font-mono">{values.doors}</b>
              </span>
            ) : null}
          </div>
        </div>
        {programme.length ? (
          <div className="rounded-[12px] border border-line bg-surface px-3 py-1">
            {programme.slice(0, 6).map((p, i) => (
              <div key={`${p.time}-${i}`} className="flex gap-3 border-b border-line py-1.5 text-[12px] last:border-b-0">
                <span className="w-10 shrink-0 font-mono text-ink-3">{p.time}</span>
                <span className="font-semibold">{p.title}</span>
              </div>
            ))}
          </div>
        ) : null}
        {values.gettingThere || values.parking ? (
          <div className="rounded-[12px] border border-line bg-surface px-3 py-2 text-[12px]">
            <span className="text-label">Getting there</span>
            {values.gettingThere ? <p className="mt-0.5 line-clamp-3">{values.gettingThere}</p> : null}
            {values.parking ? <p className="mt-1 line-clamp-2 text-ink-3">Parking: {values.parking}</p> : null}
          </div>
        ) : null}
        {facts.length ? (
          <div className="grid grid-cols-2 gap-1.5">
            {facts.slice(0, 6).map(([label, detail]) => (
              <div key={label} className="rounded-[10px] border border-line bg-surface px-2.5 py-2">
                <span className="text-label">{label}</span>
                <span className="block text-[11px] font-semibold leading-snug">{detail}</span>
              </div>
            ))}
          </div>
        ) : null}
        {!programme.length && !facts.length && !values.entrance && !values.gettingThere ? (
          <p className="rounded-[12px] border border-dashed border-line-2 px-3 py-4 text-center font-mono text-[11px] text-ink-3">
            Fill in the form and this preview updates.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function GuideEditor({
  orgId,
  eventId,
  eventTitle,
  eventDayLabel,
  initial,
  completeness,
}: {
  orgId: string
  eventId: string
  eventTitle: string
  eventDayLabel: string | null
  initial: GuideFormValues
  completeness: { filled: number; total: number; missing: string[] }
}) {
  const [state, action, pending] = React.useActionState(saveGuideAction, INITIAL)
  const [values, setValues] = React.useState<GuideFormValues>(() => ({
    ...initial,
    programme: initial.programme.length ? initial.programme : [{ time: "", title: "", where: "" }],
    facilities: initial.facilities.length ? initial.facilities : [{ label: "", detail: "" }],
  }))

  const set = (key: keyof GuideFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }))
  const setProgramme = (i: number, key: "time" | "title" | "where", value: string) =>
    setValues((v) => ({ ...v, programme: v.programme.map((p, j) => (j === i ? { ...p, [key]: value } : p)) }))
  const setFacility = (i: number, key: "label" | "detail", value: string) =>
    setValues((v) => ({ ...v, facilities: v.facilities.map((f, j) => (j === i ? { ...f, [key]: value } : f)) }))

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <form action={action} className="flex min-w-0 flex-col gap-5">
        <input type="hidden" name="orgId" value={orgId} />
        <input type="hidden" name="eventId" value={eventId} />

        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-[14px] font-semibold">
                {completeness.filled} of {completeness.total} essentials filled in
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-3">
                {completeness.missing.length ? `Still missing: ${completeness.missing.join(", ")}` : "Ticket holders have everything they need."}
              </p>
            </div>
            <Chip size="sm" variant={completeness.missing.length ? "muted" : "accent"}>
              {completeness.missing.length ? "In progress" : "Ready"}
            </Chip>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4 p-5">
            <div>
              <h2 className="text-h3">Arrival</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">Shown with the QR code on the day{eventDayLabel ? ` (${eventDayLabel})` : ""}.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
              <Field label="Doors open" hint="24-hour, e.g. 14:00">
                <Input name="doors" inputMode="numeric" placeholder="14:00" value={values.doors} onChange={set("doors")} />
              </Field>
              <Field label="Entrance" hint="Where to show tickets">
                <Input name="entrance" placeholder="Main entrance, Gate 2" value={values.entrance} onChange={set("entrance")} />
              </Field>
            </div>
            <Field label="Getting there">
              <Textarea name="getting_there" rows={3} placeholder="Directions, landmarks, shuttles or taxis" value={values.gettingThere} onChange={set("gettingThere")} />
            </Field>
            <Field label="Parking">
              <Input name="parking" placeholder="Free parking on site, overflow at Car park B" value={values.parking} onChange={set("parking")} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-3 p-5">
            <div>
              <h2 className="text-h3">Running order</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">On the day, the line that is on now is highlighted.</p>
            </div>
            <div className="flex flex-col gap-2">
              {values.programme.map((row, i) => (
                <div key={i} className="grid grid-cols-[84px_minmax(0,1fr)_40px] gap-2 sm:grid-cols-[84px_minmax(0,1fr)_minmax(0,160px)_40px]">
                  <Input name="programme_time" aria-label={`Line ${i + 1} time`} placeholder="19:00" value={row.time} onChange={(e) => setProgramme(i, "time", e.target.value)} />
                  <Input name="programme_title" aria-label={`Line ${i + 1} what happens`} placeholder="Headliner" value={row.title} onChange={(e) => setProgramme(i, "title", e.target.value)} />
                  <Input
                    name="programme_where"
                    aria-label={`Line ${i + 1} where`}
                    placeholder="Main stage"
                    className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto"
                    value={row.where}
                    onChange={(e) => setProgramme(i, "where", e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={`Remove line ${i + 1}`}
                    onClick={() => setValues((v) => ({ ...v, programme: v.programme.filter((_, j) => j !== i) }))}
                    className="inline-flex h-[42px] w-10 items-center justify-center rounded-md border border-line-2 text-ink-3 hover:bg-bg hover:text-ink sm:row-start-auto"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={values.programme.length >= 30}
              onClick={() => setValues((v) => ({ ...v, programme: [...v.programme, { time: "", title: "", where: "" }] }))}
            >
              <Icon name="plus" size={14} /> Add a line
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-col gap-4 p-5">
            <div>
              <h2 className="text-h3">Good to know</h2>
              <p className="mt-0.5 text-[13px] text-ink-3">Doors, ages, parking and payment also show on your public event page.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ages">
                <Input name="age_rule" placeholder="18+ with ID" value={values.ageRule} onChange={set("ageRule")} />
              </Field>
              <Field label="Payment at the venue">
                <Input name="payment_note" placeholder="Cashless: card and mobile money" value={values.paymentNote} onChange={set("paymentNote")} />
              </Field>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Venue info</Label>
              {values.facilities.map((row, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)_40px] gap-2">
                  <Input name="facility_label" aria-label={`Venue info ${i + 1} name`} placeholder="Toilets" value={row.label} onChange={(e) => setFacility(i, "label", e.target.value)} />
                  <Input name="facility_detail" aria-label={`Venue info ${i + 1} where`} placeholder="Behind the VIP deck" value={row.detail} onChange={(e) => setFacility(i, "detail", e.target.value)} />
                  <button
                    type="button"
                    aria-label={`Remove venue info ${i + 1}`}
                    onClick={() => setValues((v) => ({ ...v, facilities: v.facilities.filter((_, j) => j !== i) }))}
                    className="inline-flex h-[42px] w-10 items-center justify-center rounded-md border border-line-2 text-ink-3 hover:bg-bg hover:text-ink"
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                disabled={values.facilities.length >= 12}
                onClick={() => setValues((v) => ({ ...v, facilities: [...v.facilities, { label: "", detail: "" }] }))}
              >
                <Icon name="plus" size={14} /> Add venue info
              </Button>
            </div>
            <Field label="What to bring">
              <Textarea name="what_to_bring" rows={2} placeholder="Photo ID, a jacket for after sunset" value={values.whatToBring} onChange={set("whatToBring")} />
            </Field>
            <Field label="House rules">
              <Textarea name="house_rules" rows={2} placeholder="No re-entry after 20:00. No glass." value={values.houseRules} onChange={set("houseRules")} />
            </Field>
            <Field label="Help on the day" hint="A phone, WhatsApp or email ticket holders can use">
              <Input name="help_contact" placeholder="WhatsApp +268 7600 0000" value={values.helpContact} onChange={set("helpContact")} />
            </Field>
          </CardBody>
        </Card>

        <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-line bg-bg/95 px-1 py-3 backdrop-blur">
          <Notice state={state} />
          <Button type="submit" variant="primary" disabled={pending} className="self-start">
            {pending ? "Saving…" : "Save guide"}
          </Button>
        </div>
      </form>

      <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
        <span className="text-label">What ticket holders see on the day</span>
        <Preview title={eventTitle} values={values} />
      </aside>
    </div>
  )
}

function HideUpdateForm({ orgId, eventId, updateId }: { orgId: string; eventId: string; updateId: string }) {
  const [state, action, pending] = React.useActionState(hideUpdateAction, INITIAL)
  const [open, setOpen] = React.useState(false)
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[12px] font-semibold text-ink-3 hover:text-ink hover:underline">
        Hide
      </button>
    )
  }
  return (
    <form action={action} className="mt-2 flex w-full flex-col gap-2">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="updateId" value={updateId} />
      <Input name="reason" aria-label="Why hide this update" placeholder="Why hide it? e.g. posted by mistake" required minLength={3} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Hiding…" : "Hide from ticket holders"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <Notice state={state} />
    </form>
  )
}

export function UpdatesPanel({ orgId, eventId, updates }: { orgId: string; eventId: string; updates: GuideUpdateRow[] }) {
  const [state, action, pending] = React.useActionState(postUpdateAction, INITIAL)
  const formRef = React.useRef<HTMLFormElement>(null)
  React.useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-5">
        <h2 className="text-h3">Updates</h2>
        <p className="text-[13px] text-ink-3">
          Short official notices for ticket holders, like a time change or a parking tip. They show in the event guide.
        </p>
      </CardBody>
      <CardDivider />
      <CardBody className="p-5">
        <form ref={formRef} action={action} className="flex flex-col gap-3">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="eventId" value={eventId} />
          <Field label="Title">
            <Input name="title" maxLength={120} placeholder="Gates open 30 minutes earlier" required />
          </Field>
          <Field label="Details (optional)">
            <Textarea name="body" rows={2} maxLength={1000} placeholder="To ease queues, doors now open at 13:30." />
          </Field>
          <label className="flex items-start gap-2.5 text-[13px]">
            <input type="checkbox" name="notify" className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
            <span>
              <span className="font-semibold">Notify ticket holders</span>
              <span className="block font-mono text-[11px] text-ink-3">For things they must know. Up to 3 a day.</span>
            </span>
          </label>
          <Notice state={state} />
          <Button type="submit" variant="primary" size="sm" className="self-start" disabled={pending}>
            {pending ? "Posting…" : "Post update"}
          </Button>
        </form>
      </CardBody>
      {updates.length ? (
        <>
          <CardDivider />
          <ul className="flex flex-col divide-y divide-line">
            {updates.map((u) => (
              <li key={u.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className={"text-[14px] font-semibold " + (u.hidden ? "text-ink-3 line-through" : "")}>{u.title}</p>
                  {u.body ? <p className="mt-0.5 text-[13px] text-ink-2">{u.body}</p> : null}
                  <p className="mt-1 font-mono text-[11px] text-ink-3">
                    {u.whenLabel}
                    {u.notified ? " · notified" : ""}
                    {u.hidden ? ` · hidden: ${u.hiddenReason ?? ""}` : ""}
                  </p>
                </div>
                {u.hidden ? null : <HideUpdateForm orgId={orgId} eventId={eventId} updateId={u.id} />}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Card>
  )
}

export interface FeedbackSummaryView {
  count: number
  average: number | null
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>
  comments: Array<{ rating: number; comment: string; whenLabel: string }>
}

/**
 * After the event: the anonymous rating summary and the highlights attendees
 * see in their event memory.
 */
export function AfterEventPanel({
  orgId,
  eventId,
  feedback,
  highlights,
}: {
  orgId: string
  eventId: string
  feedback: FeedbackSummaryView | null
  highlights: Array<{ id: string; imageUrl: string; caption: string | null }>
}) {
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [caption, setCaption] = React.useState("")
  const fileRef = React.useRef<HTMLInputElement>(null)
  const max = Math.max(1, ...Object.values(feedback?.distribution ?? { "1": 0 }))

  async function upload(file: File) {
    setBusy(true)
    setMessage(null)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("eventId", eventId)
      const response = await fetch("/api/uploads", { method: "POST", body })
      const json = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !json.url) {
        setMessage({ ok: false, text: json.error ?? "Couldn't upload that photo." })
        return
      }
      const result = await addHighlightAction(orgId, eventId, json.url, caption)
      setMessage({ ok: result.ok, text: result.message ?? "" })
      if (result.ok) setCaption("")
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function remove(id: string) {
    setBusy(true)
    const result = await removeHighlightAction(orgId, eventId, id)
    setMessage({ ok: result.ok, text: result.message ?? "" })
    setBusy(false)
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-5">
        <h2 className="text-h3">After the event</h2>
        <p className="text-[13px] text-ink-3">
          Private ratings from people who were there, and the highlights they see in their event memory.
        </p>
      </CardBody>
      <CardDivider />
      <CardBody className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <span className="text-label">Ratings · anonymous</span>
          {feedback && feedback.count > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[28px] font-semibold tabular-nums">{feedback.average?.toFixed(1) ?? "–"}</span>
                <span className="text-[13px] text-ink-3">
                  from {feedback.count} {feedback.count === 1 ? "rating" : "ratings"}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {(["5", "4", "3", "2", "1"] as const).map((star) => (
                  <li key={star} className="flex items-center gap-2 text-[12px]">
                    <span className="w-6 font-mono text-ink-3">{star}★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(feedback.distribution[star] / max) * 100}%` }} />
                    </span>
                    <span className="w-6 text-right font-mono tabular-nums text-ink-3">{feedback.distribution[star]}</span>
                  </li>
                ))}
              </ul>
              {feedback.comments.length ? (
                <ul className="flex max-h-72 flex-col divide-y divide-line overflow-auto rounded-[var(--radius)] border border-line">
                  {feedback.comments.map((c, i) => (
                    <li key={i} className="px-3 py-2.5">
                      <p className="text-[13px] text-ink-2">{c.comment}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink-3">
                        {c.rating}★ · {c.whenLabel}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="rounded-[var(--radius)] border border-dashed border-line-2 px-3 py-4 text-center font-mono text-[11px] text-ink-3">
              No ratings yet. People who were scanned in are asked the morning after.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-label">Highlights · {highlights.length} of 12</span>
          {highlights.length ? (
            <ul className="grid grid-cols-3 gap-2">
              {highlights.map((h) => (
                <li key={h.id} className="relative overflow-hidden rounded-[var(--radius-md)] border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.imageUrl} alt={h.caption ?? ""} className="aspect-square w-full object-cover" />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(h.id)}
                    aria-label="Remove highlight"
                    className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface/90 text-ink hover:bg-surface"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {highlights.length < 12 ? (
            <div className="flex flex-col gap-2">
              <Input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={140} placeholder="Caption (optional)" aria-label="Caption for the next photo" />
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-line-2 px-3 py-2 text-[13px] font-semibold hover:bg-bg">
                <Icon name="plus" size={14} /> {busy ? "Uploading…" : "Add a photo"}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void upload(file)
                  }}
                />
              </label>
              <span className="font-mono text-[11px] text-ink-3">JPG, PNG or WebP, under 8 MB.</span>
            </div>
          ) : null}
          {message ? (
            <p role="status" className={"text-[13px] font-semibold " + (message.ok ? "text-success" : "text-danger")}>
              {message.text}
            </p>
          ) : null}
        </div>
      </CardBody>
    </Card>
  )
}
