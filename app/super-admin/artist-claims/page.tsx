import Link from "next/link"

import { mergeArtistsAction, resetArtistOwnerAction, reviewArtistClaimAction } from "@/app/super-admin/artist-claims/actions"
import { MergeArtistsForm, ResetArtistOwnerForm } from "@/components/super-admin/ArtistToolsForms"
import { VenueClaimReviewForm } from "@/components/super-admin/VenueClaimReviewForm"
import { ClaimsSwitch } from "@/components/super-admin/claims-switch"
import { Facts, Panel, Pill, when } from "@/components/super-admin/console-ui"
import { listArtistClaims, type ArtistClaimFilter } from "@/lib/data/admin/artist-claims"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { canDo } from "@/lib/super-admin/console"
import { cn } from "@/lib/cn"
import { claimStatusLabel } from "@/lib/artists/core"

export const metadata = { title: "Artist claims · Admin" }
export const dynamic = "force-dynamic"

const FILTERS: Array<{ key: ArtistClaimFilter; label: string }> = [
  { key: "pending", label: "Waiting for review" },
  { key: "closed", label: "Decided" },
]

export default async function ArtistClaimsPage({ searchParams }: { searchParams: Promise<{ c?: string; f?: string }> }) {
  const { roleTier } = await requireAdminRole(["super_admin", "support_admin", "event_ops_admin", "finance_admin", "read_only_admin"])
  const params = await searchParams
  const filter = FILTERS.find((f) => f.key === params.f)?.key ?? "pending"
  const claims = await listArtistClaims(filter)
  const selected = claims.find((c) => c.id === params.c) ?? claims[0] ?? null
  const canAct = canDo("review_artist_claim", roleTier)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Claims</h1>
        <p className="text-[13px] text-ink-3">
          Performers and managers asking to take over an artist profile organisers created. Check the evidence against the artist&apos;s
          official pages before approving. A second owner claim is a dispute: contact both people first.
        </p>
      </div>

      <ClaimsSwitch active="artists" />

      <nav className="flex flex-wrap gap-2" aria-label="Filter claims">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/super-admin/artist-claims?f=${f.key}`}
            className={cn(
              "min-h-[36px] rounded-full border px-3 py-1.5 text-[13px] font-medium",
              f.key === filter ? "border-ink bg-ink text-surface" : "border-line-2 bg-surface text-ink-2 hover:bg-bg",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {claims.length === 0 ? (
        <Panel>
          <p className="text-[13px] text-ink-3">Nothing here.</p>
        </Panel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel title={`${claims.length} request${claims.length === 1 ? "" : "s"}`}>
            <ul className="flex flex-col divide-y divide-line">
              {claims.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/super-admin/artist-claims?f=${filter}&c=${c.id}`}
                    className={cn("flex flex-col gap-0.5 px-2 py-2.5 hover:bg-bg", selected?.id === c.id && "bg-bg")}
                  >
                    <span className="text-[14px] font-semibold text-ink">{c.artist.name}</span>
                    <span className="truncate text-[13px] text-ink-2">
                      {c.claimant.name ?? c.claimant.email ?? "Unknown"} · {c.claimantRole === "artist_owner" ? "claims to be the artist" : "asks to manage"}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {when(c.createdAt)}
                      {c.artist.ownerId && c.claimantRole === "artist_owner" && c.artist.ownerId !== c.claimant.id ? " · DISPUTE" : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          {selected ? (
            <Panel
              title="Request"
              aside={
                <Pill tone={selected.status === "pending" ? "warning" : selected.status === "approved" ? "success" : selected.status === "rejected" ? "danger" : "muted"}>
                  {claimStatusLabel(selected.status)}
                </Pill>
              }
            >
              <div className="flex flex-col gap-4">
                <Facts
                  items={[
                    { label: "Artist", value: selected.artist.name, sub: `${selected.artist.verified ? "verified" : "unverified"} · on ${selected.artist.lineups} line-up${selected.artist.lineups === 1 ? "" : "s"}` },
                    { label: "Requester", value: selected.claimant.name ?? "—", sub: selected.claimant.email ?? undefined },
                    { label: "Asks to be", value: selected.claimantRole === "artist_owner" ? "The artist (owner)" : "Manager" },
                    { label: "Phone given", value: selected.contactPhone ?? "—" },
                    { label: "Current owner", value: selected.artist.ownerId ? "Yes" : "None" },
                  ]}
                />
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] font-semibold text-ink">Evidence</span>
                  <p className="whitespace-pre-line rounded-lg bg-bg px-3 py-2 text-[14px] leading-relaxed text-ink">{selected.evidence}</p>
                  <span className="text-[12px] text-ink-3">Sent {when(selected.createdAt)}</span>
                </div>
                {selected.reviewedAt ? (
                  <p className="text-[13px] text-ink-2">
                    {claimStatusLabel(selected.status)} {when(selected.reviewedAt)}.{selected.reviewNote ? ` "${selected.reviewNote}"` : ""}
                  </p>
                ) : null}
                {canAct && selected.status === "pending" ? (
                  <VenueClaimReviewForm
                    action={reviewArtistClaimAction}
                    claimId={selected.id}
                    ownerConflict={Boolean(selected.artist.ownerId && selected.claimantRole === "artist_owner" && selected.artist.ownerId !== selected.claimant.id)}
                  />
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>
      )}
      {canAct ? (
        <Panel title="Artist profile tools">
          <div className="grid gap-6 md:grid-cols-2">
            <MergeArtistsForm action={mergeArtistsAction} />
            <ResetArtistOwnerForm action={resetArtistOwnerAction} />
          </div>
          <p className="mt-3 text-[12px] text-ink-3">
            Merging keeps every line-up and follower on the canonical profile and redirects the old URL. Removing an owner keeps line-ups
            and followers. Both are written to the audit log.
          </p>
        </Panel>
      ) : null}
    </div>
  )
}
