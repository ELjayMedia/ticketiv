"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/quiet/ui/button"
import { Input, Label } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import type { EventSponsor, LibrarySponsor } from "@/lib/sponsors"

// Event wizard → Sponsors. Sponsors are one shared directory, like venues: a
// sponsor (name, logo, website) is added once and any organiser can pick it.
// On this event: choose which sponsors show, in what order, and which are
// featured. Organisers can fill in a missing logo or website; changing an
// existing logo is done by Ticketiv (command centre).

type Payload = { sponsors: EventSponsor[]; library: LibrarySponsor[]; sponsorId?: string; error?: string }

const EMPTY_FORM = { id: "", name: "", websiteUrl: "", logoUrl: "", hasLogo: false, hasWebsite: false }

export function SponsorsStep({ eventId, onSaving }: { eventId: string; onSaving: () => void }) {
  const [sponsors, setSponsors] = useState<EventSponsor[]>([])
  const [library, setLibrary] = useState<LibrarySponsor[]>([])
  const [query, setQuery] = useState("")
  const [form, setForm] = useState<typeof EMPTY_FORM | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    fetch(`/api/events/${eventId}/sponsors`, { cache: "no-store" })
      .then(async (res) => {
        const payload = (await res.json().catch(() => ({}))) as Payload
        if (cancelled) return
        if (!res.ok) throw new Error(payload.error || "Couldn't load sponsors")
        setSponsors(payload.sponsors ?? [])
        setLibrary(payload.library ?? [])
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't load sponsors"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [eventId])

  useEffect(() => {
    if (loading) return
    const q = query.trim()
    const timer = window.setTimeout(() => {
      fetch(`/api/events/${eventId}/sponsors${q ? `?q=${encodeURIComponent(q)}` : ""}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((payload: Payload | null) => payload && setLibrary(payload.library ?? []))
        .catch(() => {})
    }, 250)
    return () => window.clearTimeout(timer)
  }, [eventId, query, loading])

  const onEvent = useMemo(() => new Set(sponsors.map((s) => s.id)), [sponsors])
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return library.filter((s) => !onEvent.has(s.id) && (!q || s.name.toLowerCase().includes(q))).slice(0, 8)
  }, [library, onEvent, query])
  const exactMatch = library.some((s) => s.name.trim().toLowerCase() === query.trim().toLowerCase())

  async function post(body: Record<string, unknown>): Promise<Payload | null> {
    setBusy(true)
    setError("")
    onSaving()
    try {
      const res = await fetch(`/api/events/${eventId}/sponsors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = (await res.json().catch(() => ({}))) as Payload
      if (!res.ok) throw new Error(payload.error || "Couldn't save the sponsors")
      setSponsors(payload.sponsors ?? [])
      setLibrary(payload.library ?? [])
      return payload
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the sponsors")
      return null
    } finally {
      setBusy(false)
    }
  }

  function saveList(next: EventSponsor[]) {
    return post({ action: "set_event_sponsors", sponsors: next.map((s) => ({ sponsor_id: s.id, featured: s.featured })) })
  }

  function addToEvent(s: LibrarySponsor) {
    setQuery("")
    void saveList([...sponsors, { ...s, featured: false }])
  }

  function move(index: number, by: -1 | 1) {
    const next = [...sponsors]
    const target = index + by
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    void saveList(next)
  }

  async function uploadLogo(file: File | undefined) {
    if (!file || !form) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setError("Use a PNG, JPG or WebP logo.")
    if (file.size > 2 * 1024 * 1024) return setError("Logos must be smaller than 2 MB.")
    setUploading(true)
    setError("")
    try {
      const data = new FormData()
      data.append("file", file)
      data.append("eventId", eventId)
      data.append("kind", "sponsor_logo")
      const res = await fetch("/api/uploads", { method: "POST", body: data })
      const payload = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!res.ok || !payload.url) throw new Error(payload.error || "Couldn't upload the logo")
      setForm((f) => (f ? { ...f, logoUrl: payload.url! } : f))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload the logo")
    } finally {
      setUploading(false)
    }
  }

  async function saveSponsor() {
    if (!form) return
    const editing = Boolean(form.id)
    const payload = await post({
      action: "save_sponsor",
      sponsor_id: form.id || undefined,
      name: form.id ? undefined : form.name,
      website_url: form.hasWebsite ? undefined : form.websiteUrl,
      logo_url: form.hasLogo ? undefined : form.logoUrl,
    })
    if (!payload) return
    setForm(null)
    setQuery("")
    if (!editing && payload.sponsorId && !payload.sponsors.some((s) => s.id === payload.sponsorId)) {
      const added = payload.library.find((s) => s.id === payload.sponsorId)
      if (added) await saveList([...payload.sponsors, { ...added, featured: false }])
    }
  }

  if (loading) return <div className="p-2 text-sm text-ink-3">Loading sponsors…</div>

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-surface-2/30 p-4">
        <div className="flex gap-3">
          <Icon name="spark" className="mt-0.5 h-5 w-5 text-ink-3" />
          <div>
            <h3 className="font-medium">Sponsors</h3>
            <p className="mt-1 text-sm text-ink-3">
              Sponsors are shared across Ticketiv, like venues: search first, and add a sponsor with its logo only if it isn&apos;t
              listed. Once a logo is set, only Ticketiv can change it. Featured sponsors appear as
              &ldquo;Presented by&rdquo; near the top of the event page; the rest are shown in a Sponsors section. Optional.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}

      <section className="space-y-2">
        <h3 className="text-[14px] font-semibold text-ink">On this event</h3>
        {sponsors.length === 0 ? (
          <p className="text-sm text-ink-3">No sponsors yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {sponsors.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <Logo sponsor={s} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14px] font-semibold text-ink">{s.name}</span>
                  {s.websiteUrl ? <span className="truncate font-mono text-[11px] text-ink-3">{s.websiteUrl}</span> : null}
                </div>
                <label className="flex items-center gap-1.5 text-[13px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={s.featured}
                    disabled={busy}
                    onChange={(e) => void saveList(sponsors.map((x) => (x.id === s.id ? { ...x, featured: e.target.checked } : x)))}
                    className="h-4 w-4 accent-accent"
                  />
                  Featured
                </label>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="xs" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${s.name} up`}>
                    <Icon name="chevU" size={14} />
                  </Button>
                  <Button type="button" variant="ghost" size="xs" disabled={busy || i === sponsors.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${s.name} down`}>
                    <Icon name="chevD" size={14} />
                  </Button>
                  {!s.logoUrl || !s.websiteUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={busy}
                      onClick={() =>
                        setForm({ id: s.id, name: s.name, websiteUrl: s.websiteUrl ?? "", logoUrl: s.logoUrl ?? "", hasLogo: Boolean(s.logoUrl), hasWebsite: Boolean(s.websiteUrl) })
                      }
                    >
                      {s.logoUrl ? "Add website" : "Add logo"}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    disabled={busy}
                    onClick={() => void saveList(sponsors.filter((x) => x.id !== s.id))}
                    aria-label={`Remove ${s.name} from this event`}
                  >
                    <Icon name="close" size={14} />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {form ? (
        <section className="space-y-3 rounded-[var(--radius-md)] border border-line bg-bg p-4">
          <h3 className="text-[14px] font-semibold text-ink">{form.id ? `Add missing details for ${form.name}` : "New sponsor"}</h3>
          <p className="text-[12px] text-ink-3">
            {form.id ? "This sponsor is shared, so what you add shows on every event that uses it. " : ""}Once a logo is set, only Ticketiv can change it.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="sponsor-name">Name</Label>
              <Input id="sponsor-name" value={form.name} maxLength={120} readOnly={Boolean(form.id)} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="sponsor-site">
                Website <span className="font-normal text-ink-3">(optional)</span>
              </Label>
              <Input
                id="sponsor-site"
                value={form.websiteUrl}
                placeholder="example.com"
                readOnly={form.hasWebsite}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Logo sponsor={{ name: form.name || "?", logoUrl: form.logoUrl || null }} />
            {form.hasLogo ? null : <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-bg">
              <Icon name="download" size={14} /> {uploading ? "Uploading…" : form.logoUrl ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => void uploadLogo(e.target.files?.[0])} />
            </label>}
            <span className="text-[12px] text-ink-3">PNG with a transparent background works best. Up to 2 MB.</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="accent" size="sm" disabled={busy || uploading || !form.name.trim()} onClick={() => void saveSponsor()}>
              {busy ? "Saving…" : form.id ? "Save" : "Add sponsor"}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setForm(null)}>
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <section className="space-y-2">
          <Label htmlFor="sponsor-search">Add a sponsor</Label>
          <Input id="sponsor-search" value={query} placeholder="Search your sponsors, or type a new name" onChange={(e) => setQuery(e.target.value)} />
          {matches.length ? (
            <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
              {matches.map((s) => (
                <li key={s.id}>
                  <button type="button" disabled={busy} onClick={() => addToEvent(s)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg disabled:opacity-50">
                    <Logo sponsor={s} />
                    <span className="flex-1 text-[14px] text-ink">{s.name}</span>
                    <span className="text-[12px] font-semibold text-accent">Add</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {query.trim() && !exactMatch ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...EMPTY_FORM, name: query.trim() })}>
              <Icon name="plus" size={14} /> New sponsor &ldquo;{query.trim()}&rdquo;
            </Button>
          ) : !query.trim() ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...EMPTY_FORM })}>
              <Icon name="plus" size={14} /> New sponsor
            </Button>
          ) : null}
        </section>
      )}
    </div>
  )
}

function Logo({ sponsor }: { sponsor: { name: string; logoUrl: string | null } }) {
  if (sponsor.logoUrl) {
    return <img src={sponsor.logoUrl} alt="" className="h-10 w-16 shrink-0 rounded border border-line bg-surface object-contain p-1" />
  }
  return (
    <span className="inline-flex h-10 w-16 shrink-0 items-center justify-center rounded border border-dashed border-line-2 font-mono text-[10px] text-ink-4">
      {sponsor.name.slice(0, 2).toUpperCase()}
    </span>
  )
}
