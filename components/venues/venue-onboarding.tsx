"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import {
  createVenueAction,
  searchClaimableVenuesAction,
  submitVenueClaimAction,
  withdrawVenueClaimAction,
  type ClaimableVenue,
} from "@/app/onboarding/venue/actions"
import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { cn } from "@/lib/cn"
import { claimStatusLabel, VENUE_EVIDENCE_MIN, type VenueClaimStatus } from "@/lib/venues/core"

export interface MyVenueClaim {
  id: string
  venueId: string
  venueName: string
  kind: "claim" | "create"
  status: VenueClaimStatus
  reviewNote: string | null
  createdAt: string
}

type Mode = { kind: "search" } | { kind: "claim"; venue: ClaimableVenue } | { kind: "create" }

function Notice({ tone, children }: { tone: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-md px-3 py-2 text-[13px]", tone === "ok" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}
    >
      {children}
    </p>
  )
}

function EvidenceField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label">How are you connected to the venue? *</span>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="For example: I'm the general manager. Our office number is on the venue website, and you can reach me there."
      />
      <span className="text-[11px] text-ink-3">
        Only Ticketiv staff see this. {value.trim().length < VENUE_EVIDENCE_MIN ? `At least ${VENUE_EVIDENCE_MIN} characters.` : ""}
      </span>
    </label>
  )
}

export function VenueOnboarding({ claims }: { claims: MyVenueClaim[] }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>({ kind: "search" })
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ClaimableVenue[] | null>(null)
  const [searchError, setSearchError] = useState("")
  const [evidence, setEvidence] = useState("")
  const [phone, setPhone] = useState("")
  const [role, setRole] = useState<"venue_owner" | "venue_manager">("venue_manager")
  const [form, setForm] = useState({ name: "", city: "", address: "", capacity: "" })
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // Debounced search; stale responses are ignored.
  useEffect(() => {
    if (mode.kind !== "search") return
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    let live = true
    const t = setTimeout(async () => {
      const res = await searchClaimableVenuesAction(q)
      if (!live) return
      if (res.ok) {
        setResults(res.venues)
        setSearchError("")
      } else {
        setSearchError(res.message)
      }
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [query, mode.kind])

  function submitClaim(venue: ClaimableVenue) {
    setMessage(null)
    startTransition(async () => {
      const res = await submitVenueClaimAction({ venueId: venue.id, role, evidence, phone })
      setMessage({ tone: res.ok ? "ok" : "error", text: res.message })
      if (res.ok) {
        setMode({ kind: "search" })
        setEvidence("")
        router.refresh()
      }
    })
  }

  function submitCreate() {
    setMessage(null)
    startTransition(async () => {
      const res = await createVenueAction({ ...form, evidence, phone })
      if (res.ok) {
        router.push(`/manage/venues/${res.venueId}`)
        return
      }
      setMessage({ tone: "error", text: res.message })
    })
  }

  function withdraw(id: string) {
    startTransition(async () => {
      const res = await withdrawVenueClaimAction(id)
      setMessage({ tone: res.ok ? "ok" : "error", text: res.message })
      if (res.ok) router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {claims.length > 0 ? (
        <Card>
          <CardBody className="flex flex-col gap-3 p-5">
            <h2 className="text-h2">Your venue requests</h2>
            <ul className="flex flex-col divide-y divide-line">
              {claims.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-[14px] font-medium text-ink">{c.venueName}</span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {c.kind === "create" ? "New venue" : "Access request"} · {claimStatusLabel(c.status)}
                      {c.reviewNote ? ` · "${c.reviewNote}"` : ""}
                    </span>
                  </div>
                  {c.status === "approved" || (c.kind === "create" && c.status === "pending") ? (
                    <Link href={`/manage/venues/${c.venueId}`} className="text-[13px] font-semibold text-accent hover:underline">
                      Open workspace
                    </Link>
                  ) : c.status === "pending" ? (
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => withdraw(c.id)}>
                      Withdraw
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      {mode.kind === "search" ? (
        <Card>
          <CardBody className="flex flex-col gap-4 p-5">
            <FormField
              label="Find your venue"
              placeholder="Venue name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              hint="Venues organisers have already used on Ticketiv appear here."
            />
            {searchError ? <Notice tone="error">{searchError}</Notice> : null}
            {results && results.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-md)] border border-line">
                {results.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-medium text-ink">{v.name}</span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {[v.city, v.verified ? "Verified" : null, v.hasOwner ? "Has an owner" : null].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRole(v.hasOwner ? "venue_manager" : "venue_owner")
                        setMode({ kind: "claim", venue: v })
                        setMessage(null)
                      }}
                    >
                      Request access
                    </Button>
                  </li>
                ))}
              </ul>
            ) : results ? (
              <p className="text-[13px] text-ink-3">No venue matches &ldquo;{query.trim()}&rdquo;.</p>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setForm((f) => ({ ...f, name: f.name || query.trim() }))
                setMode({ kind: "create" })
                setMessage(null)
              }}
              className="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-accent hover:underline"
            >
              <Icon name="plus" size={14} />
              My venue isn&apos;t listed — add it
            </button>
          </CardBody>
        </Card>
      ) : null}

      {mode.kind === "claim" ? (
        <Card>
          <CardBody className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2">Request access to {mode.venue.name}</h2>
              <p className="text-[13px] text-ink-3">You get access once Ticketiv approves the request.</p>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-label mb-1">Your role</legend>
              {(["venue_owner", "venue_manager"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-[14px] text-ink">
                  <input type="radio" name="claim-role" value={r} checked={role === r} onChange={() => setRole(r)} className="accent-accent" />
                  {r === "venue_owner" ? "I own the venue or run it for the owner" : "I manage bookings or events there"}
                </label>
              ))}
              {mode.venue.hasOwner && role === "venue_owner" ? (
                <span className="text-[12px] text-warning">This venue already has an owner. Ticketiv will contact both of you before deciding.</span>
              ) : null}
            </fieldset>
            <EvidenceField value={evidence} onChange={setEvidence} />
            <FormField label="Phone we can verify you on" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            <div className="flex gap-2">
              <Button variant="accent" disabled={pending || evidence.trim().length < VENUE_EVIDENCE_MIN} onClick={() => submitClaim(mode.venue)}>
                {pending ? "Sending…" : "Send request"}
              </Button>
              <Button variant="ghost" onClick={() => setMode({ kind: "search" })}>
                Back
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {mode.kind === "create" ? (
        <Card>
          <CardBody className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2">Add your venue</h2>
              <p className="text-[13px] text-ink-3">
                You can manage it straight away. It shows as unverified until Ticketiv confirms you represent it.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Venue name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={160} />
              <FormField label="Town or city *" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={120} />
              <FormField label="Street address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={300} />
              <FormField
                label="Capacity"
                type="number"
                inputMode="numeric"
                min={1}
                max={200000}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </div>
            <EvidenceField value={evidence} onChange={setEvidence} />
            <FormField label="Phone we can verify you on" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            <div className="flex gap-2">
              <Button
                variant="accent"
                disabled={pending || !form.name.trim() || !form.city.trim() || evidence.trim().length < VENUE_EVIDENCE_MIN}
                onClick={submitCreate}
              >
                {pending ? "Adding…" : "Add venue"}
              </Button>
              <Button variant="ghost" onClick={() => setMode({ kind: "search" })}>
                Back
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
