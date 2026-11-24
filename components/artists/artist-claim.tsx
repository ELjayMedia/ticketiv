"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"

import {
  listMyArtistClaimsAction,
  searchClaimableArtistsAction,
  submitArtistClaimAction,
  withdrawArtistClaimAction,
  type ClaimableArtist,
  type MyArtistClaim,
} from "@/app/onboarding/talent/actions"
import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField, Textarea } from "@/components/quiet/ui/form"
import { claimStatusLabel } from "@/lib/artists/core"
import { cn } from "@/lib/cn"

/** TICK-353 — find an existing artist profile and request access to it. */
export function ArtistClaim({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<ClaimableArtist[] | null>(null)
  const [selected, setSelected] = useState<ClaimableArtist | null>(null)
  const [role, setRole] = useState<"artist_owner" | "artist_manager">("artist_owner")
  const [evidence, setEvidence] = useState("")
  const [phone, setPhone] = useState("")
  const [claims, setClaims] = useState<MyArtistClaim[]>([])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    listMyArtistClaimsAction().then(setClaims).catch(() => setClaims([]))
  }, [])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      return
    }
    let live = true
    const t = setTimeout(async () => {
      const res = await searchClaimableArtistsAction(q)
      if (live && res.ok) setResults(res.artists)
    }, 250)
    return () => {
      live = false
      clearTimeout(t)
    }
  }, [query])

  function submit() {
    if (!selected) return
    setMessage(null)
    startTransition(async () => {
      const res = await submitArtistClaimAction({ artistId: selected.id, role, evidence, phone })
      setMessage({ ok: res.ok, text: res.message })
      if (res.ok) {
        setSelected(null)
        setEvidence("")
        setClaims(await listMyArtistClaimsAction())
      }
    })
  }

  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2">Already on a line-up?</h2>
          <p className="text-[13px] text-ink-3">
            If an organiser already listed you, claim that profile so your past and future shows stay together. Ticketiv checks every request.
          </p>
        </div>

        {claims.length > 0 ? (
          <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {claims.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                <span className="min-w-0 truncate text-[13px] text-ink">
                  {c.artistName} · <span className="text-ink-3">{claimStatusLabel(c.status)}</span>
                </span>
                {c.status === "approved" ? (
                  <Link href={`/manage/artists/${c.artistId}`} className="text-[13px] font-semibold text-accent hover:underline">
                    Open workspace
                  </Link>
                ) : c.status === "pending" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await withdrawArtistClaimAction(c.id)
                        setMessage({ ok: res.ok, text: res.message })
                        setClaims(await listMyArtistClaimsAction())
                      })
                    }
                  >
                    Withdraw
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {message ? (
          <p role={message.ok ? "status" : "alert"} className={cn("rounded-md px-3 py-2 text-[13px]", message.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
            {message.text}
          </p>
        ) : null}

        {selected ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] font-semibold text-ink">Request access to {selected.name}</p>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-label mb-1">Your role</legend>
              {(["artist_owner", "artist_manager"] as const).map((r) => (
                <label key={r} className="flex items-center gap-2 text-[14px] text-ink">
                  <input type="radio" name="artist-claim-role" checked={role === r} onChange={() => setRole(r)} className="accent-accent" />
                  {r === "artist_owner" ? "I am this artist (or lead the act)" : "I manage this artist"}
                </label>
              ))}
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className="text-label">How can we confirm it&apos;s you? *</span>
              <Textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} maxLength={2000} placeholder="Links to your official pages, or who at the organiser can vouch for you." />
            </label>
            <FormField label="Phone we can verify you on" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
            <div className="flex gap-2">
              <Button variant="accent" disabled={pending || evidence.trim().length < 20} onClick={submit}>
                {pending ? "Sending…" : "Send request"}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Back
              </Button>
            </div>
          </div>
        ) : (
          <>
            <FormField label="Search artists" placeholder="Artist or act name" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
            {results && results.length > 0 ? (
              <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-md)] border border-line">
                {results.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-medium text-ink">{a.name}</span>
                      <span className="font-mono text-[11px] text-ink-3">
                        {[a.verified ? "Verified" : null, a.hasOwner ? "Has an owner" : null, a.upcomingEvents ? `${a.upcomingEvents} upcoming` : null].filter(Boolean).join(" · ") || "On Ticketiv line-ups"}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRole(a.hasOwner ? "artist_manager" : "artist_owner")
                        setSelected(a)
                        setMessage(null)
                      }}
                    >
                      Request access
                    </Button>
                  </li>
                ))}
              </ul>
            ) : results ? (
              <p className="text-[13px] text-ink-3">No artist matches. Create a new profile above.</p>
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  )
}
