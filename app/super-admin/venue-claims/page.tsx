import Link from "next/link"

import { reviewVenueClaimAction } from "@/app/super-admin/venue-claims/actions"
import { VenueClaimReviewForm } from "@/components/super-admin/VenueClaimReviewForm"
import { Facts, Panel, Pill, when } from "@/components/super-admin/console-ui"
import { listVenueClaims, type VenueClaimFilter } from "@/lib/data/admin/venue-claims"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { canDo } from "@/lib/super-admin/console"
import { cn } from "@/lib/cn"
import { claimStatusLabel } from "@/lib/venues/core"

export const metadata = { title: "Venue claims · Admin" }
export const dynamic = "force-dynamic"

const FILTERS: Array<{ key: VenueClaimFilter; label: string }> = [
  { key: "pending", label: "Waiting for review" },
  { key: "closed", label: "Decided" },
]

export default async function VenueClaimsPage({ searchParams }: { searchParams: Promise<{ c?: string; f?: string }> }) {
  const { roleTier } = await requireAdminRole(["super_admin", "support_admin", "event_ops_admin", "finance_admin", "read_only_admin"])
  const params = await searchParams
  const filter = FILTERS.find((f) => f.key === params.f)?.key ?? "pending"
  const claims = await listVenueClaims(filter)
  const selected = claims.find((c) => c.id === params.c) ?? claims[0] ?? null
  const canAct = canDo("review_venue_claim", roleTier)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Venue claims</h1>
        <p className="text-[13px] text-ink-3">
          People asking to manage a venue, and new venues waiting for verification. Check the evidence (call the venue&apos;s public number,
          not the one supplied) before approving. A second owner claim is a dispute: contact both people first.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filter claims">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/super-admin/venue-claims?f=${f.key}`}
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
                    href={`/super-admin/venue-claims?f=${filter}&c=${c.id}`}
                    className={cn("flex flex-col gap-0.5 px-2 py-2.5 hover:bg-bg", selected?.id === c.id && "bg-bg")}
                  >
                    <span className="text-[14px] font-semibold text-ink">{c.venue.name}</span>
                    <span className="truncate text-[13px] text-ink-2">
                      {c.claimant.name ?? c.claimant.email ?? "Unknown"} · {c.kind === "create" ? "added this venue" : c.claimantRole === "venue_owner" ? "claims ownership" : "asks to manage"}
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      {when(c.createdAt)}
                      {c.venue.ownerId && c.claimantRole === "venue_owner" && c.venue.ownerId !== c.claimant.id ? " · DISPUTE" : ""}
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
                    { label: "Venue", value: selected.venue.name, sub: [selected.venue.city, selected.venue.verified ? "verified" : "unverified"].filter(Boolean).join(" · ") },
                    { label: "Requester", value: selected.claimant.name ?? "—", sub: selected.claimant.email ?? undefined },
                    { label: "Asks to be", value: selected.claimantRole === "venue_owner" ? "Owner" : "Manager", sub: selected.kind === "create" ? "Created the venue" : "Existing venue" },
                    { label: "Phone given", value: selected.contactPhone ?? "—" },
                    { label: "Current team", value: String(selected.venue.memberCount), sub: selected.venue.ownerId ? "has an owner" : "no owner" },
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
                {selected.kind === "create" && selected.status === "pending" ? (
                  <p className="rounded-lg bg-bg px-3 py-2 text-[13px] text-ink-2">
                    The requester already manages this new venue. Rejecting removes their access; the venue record stays so organisers&apos; events keep it.
                  </p>
                ) : null}
                {canAct && selected.status === "pending" ? (
                  <VenueClaimReviewForm
                    action={reviewVenueClaimAction}
                    claimId={selected.id}
                    ownerConflict={Boolean(selected.venue.ownerId && selected.claimantRole === "venue_owner" && selected.venue.ownerId !== selected.claimant.id)}
                  />
                ) : null}
              </div>
            </Panel>
          ) : null}
        </div>
      )}
    </div>
  )
}
