import Link from "next/link"

import { assignVenueAdminAction, createVenueAction, removeVenueAdminAction } from "@/app/super-admin/venues/actions"
import { AssignVenueAdminForm, CreateVenueForm, RemoveVenueAdminForm } from "@/components/super-admin/VenueAccessForms"
import { Facts, Panel, Pill, when } from "@/components/super-admin/console-ui"
import { getAdminVenue, listAdminVenues } from "@/lib/data/admin/venues"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { canDo, isUuid } from "@/lib/super-admin/console"
import { cn } from "@/lib/cn"
import { venueRoleLabel } from "@/lib/venues/core"

export const metadata = { title: "Venues · Admin" }
export const dynamic = "force-dynamic"

/**
 * Command centre → Venues (venue MVP). Find or add a venue, see who manages it,
 * and give a named person a venue workspace (owner = venue admin). The owner
 * of Ticketiv makes these changes; other admin tiers can look.
 */
export default async function AdminVenuesPage({ searchParams }: { searchParams: Promise<{ q?: string; v?: string; new?: string }> }) {
  const { roleTier } = await requireAdminRole(["super_admin", "support_admin", "event_ops_admin", "finance_admin", "read_only_admin"])
  const params = await searchParams
  const query = (params.q ?? "").slice(0, 80)
  const canAct = canDo("manage_venue_access", roleTier)
  const [venues, selected] = await Promise.all([
    listAdminVenues(query),
    params.v && isUuid(params.v) ? getAdminVenue(params.v) : Promise.resolve(null),
  ])
  const showCreate = canAct && params.new === "1"
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(query ? { q: query } : {}), ...extra })
    return `/super-admin/venues?${p}`
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Venues</h1>
          <p className="max-w-2xl text-[13px] text-ink-3">
            Give venue teams their own dashboard to manage bookings, availability and booking requests from organisers. Find the venue
            (or add it), then give access to the person who runs it. People asking for access themselves are in{" "}
            <Link href="/super-admin/venue-claims" className="font-semibold text-accent hover:underline">
              Venue claims
            </Link>
            .
          </p>
        </div>
        {canAct ? (
          <Link
            href={qs({ new: "1" })}
            className="inline-flex min-h-[36px] items-center rounded-full border border-ink bg-ink px-4 text-[13px] font-semibold text-surface"
          >
            Add a venue
          </Link>
        ) : null}
      </div>

      {showCreate ? (
        <Panel title="Add a venue">
          <p className="mb-3 text-[13px] text-ink-3">Search first: organisers may have added it already when they created an event there.</p>
          <CreateVenueForm action={createVenueAction} />
        </Panel>
      ) : null}

      <form action="/super-admin/venues" className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by venue name or city"
          aria-label="Search venues"
          className="min-h-[40px] w-full max-w-md rounded-[var(--radius)] border border-line-2 bg-surface px-3 text-[14px] outline-none focus:border-accent focus:ring-[3px] focus:ring-accent-soft"
        />
        <button type="submit" className="min-h-[40px] rounded-[var(--radius)] border border-line-2 bg-surface px-4 text-[13px] font-semibold text-ink hover:bg-bg">
          Search
        </button>
      </form>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel title={query ? `${venues.length} match${venues.length === 1 ? "" : "es"}` : "Recently added"}>
          {venues.length === 0 ? (
            <p className="text-[13px] text-ink-3">No venues found.{canAct ? " Add it with \"Add a venue\"." : ""}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {venues.map((v) => (
                <li key={v.id}>
                  <Link href={qs({ v: v.id })} className={cn("flex items-center justify-between gap-3 px-2 py-2.5 hover:bg-bg", selected?.id === v.id && "bg-bg")}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-[14px] font-semibold text-ink">{v.name}</span>
                      <span className="truncate text-[12px] text-ink-3">
                        {v.city ?? "—"} · {v.memberCount === 0 ? "no venue team" : `${v.memberCount} on the team`}
                      </span>
                    </span>
                    <span className="flex shrink-0 gap-1">
                      {v.verified ? <Pill tone="success">Verified</Pill> : <Pill tone="muted">Unverified</Pill>}
                      {!v.hasOwner ? <Pill tone="warning">No admin</Pill> : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {selected ? (
          <Panel title={selected.name} aside={selected.verified ? <Pill tone="success">Verified</Pill> : <Pill tone="warning">Unverified</Pill>}>
            <div className="flex flex-col gap-5">
              <Facts
                items={[
                  { label: "Location", value: selected.city ?? "—", sub: selected.address ?? undefined },
                  { label: "Capacity", value: selected.capacity ? selected.capacity.toLocaleString("en-SZ") : "—" },
                  { label: "Open booking requests", value: String(selected.openLeads) },
                  { label: "Upcoming bookings", value: String(selected.upcomingBookings), sub: `${selected.upcomingEvents} upcoming event${selected.upcomingEvents === 1 ? "" : "s"}` },
                  { label: "Contact", value: selected.contactEmail ?? "—", sub: selected.contactPhone ?? undefined },
                  { label: "Pending claims", value: String(selected.pendingClaims), sub: selected.pendingClaims ? "see Venue claims" : undefined },
                ]}
              />
              <div className="flex flex-wrap gap-3 text-[13px]">
                {selected.slug && selected.verified ? (
                  <Link href={`/venues/${selected.slug}`} className="font-semibold text-accent hover:underline">
                    Public page
                  </Link>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-[14px] font-semibold text-ink">Venue team</h3>
                {selected.members.length === 0 ? (
                  <p className="rounded-lg bg-bg px-3 py-2 text-[13px] text-ink-2">Nobody manages this venue yet. Booking requests can&apos;t be answered until someone does.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
                    {selected.members.map((m) => (
                      <li key={m.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[14px] font-medium text-ink">
                            {m.name ?? m.email ?? "Unknown"} <span className="text-ink-3">· {venueRoleLabel(m.role)}</span>
                          </span>
                          <span className="truncate text-[12px] text-ink-3">
                            {m.email ?? "—"} · since {when(m.addedAt)} ·{" "}
                            <Link href={`/super-admin/people/${m.userId}`} className="text-accent hover:underline">
                              Person
                            </Link>
                          </span>
                        </span>
                        {canAct ? <RemoveVenueAdminForm action={removeVenueAdminAction} venueId={selected.id} userId={m.userId} label={m.email ?? m.userId} /> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {canAct ? (
                <div className="flex flex-col gap-2 border-t border-line pt-4">
                  <h3 className="text-[14px] font-semibold text-ink">Give someone access</h3>
                  <AssignVenueAdminForm action={assignVenueAdminAction} venueId={selected.id} verified={selected.verified} hasOwner={selected.hasOwner} />
                </div>
              ) : (
                <p className="text-[12px] text-ink-3">Only the Ticketiv owner can change venue access.</p>
              )}
              {selected.createdAt ? <p className="font-mono text-[11px] text-ink-3">Added {when(selected.createdAt)}</p> : null}
            </div>
          </Panel>
        ) : (
          <Panel>
            <p className="text-[13px] text-ink-3">Pick a venue to see its team and give access.</p>
          </Panel>
        )}
      </div>
    </div>
  )
}
