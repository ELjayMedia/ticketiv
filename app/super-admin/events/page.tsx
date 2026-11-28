import Link from "next/link"

import { createEventAction } from "@/app/super-admin/onboarding/actions"
import { CreateEventForm } from "@/components/super-admin/OnboardingForms"
import { Panel, Pill, when } from "@/components/super-admin/console-ui"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { canDo, isUuid } from "@/lib/super-admin/console"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Events · Admin" }
export const dynamic = "force-dynamic"

const STATUSES = ["draft", "published", "paused", "archived"] as const
const TONE: Record<string, "success" | "warning" | "muted" | "danger"> = { published: "success", draft: "muted", paused: "warning", archived: "muted" }
const PAGE = 50

type Row = {
  id: string
  org_id: string
  title: string | null
  slug: string | null
  status: string | null
  visibility: string | null
  starts_at: string | null
  cancelled_at: string | null
  organizations: { name: string | null } | null
}

/**
 * Every event on Ticketiv. Platform admins open any event in the organiser's
 * own editor and workspace (the same screens org admins use); the owner can
 * also create an event for an organiser and give it an event admin.
 */
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; org?: string; page?: string; new?: string }>
}) {
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  const params = await searchParams
  const q = (params.q ?? "").trim().slice(0, 80)
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? params.status! : ""
  const org = params.org && isUuid(params.org) ? params.org : ""
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0)
  const canCreate = canDo("create_organizers_events", roleTier)
  const canEdit = roleTier !== "read_only_admin"

  const admin = createAdminClient()
  let query = admin
    .from("events")
    .select("id, org_id, title, slug, status, visibility, starts_at, cancelled_at, organizations:org_id(name)", { count: "exact" })
    .order("starts_at", { ascending: false, nullsFirst: true })
    .range(page * PAGE, page * PAGE + PAGE - 1)
  if (q) query = query.ilike("title", `%${q.replace(/[%_,()]/g, "")}%`)
  if (status) query = query.eq("status", status as (typeof STATUSES)[number])
  if (org) query = query.eq("org_id", org)
  const [{ data, count, error }, orgsRes] = await Promise.all([
    query,
    canCreate && params.new === "1" ? admin.from("organizations").select("id, name").order("name").limit(1000) : Promise.resolve({ data: null }),
  ])
  const rows = (data ?? []) as unknown as Row[]
  const organisations = ((orgsRes.data ?? []) as { id: string; name: string | null }[]).map((o) => ({ id: o.id, name: o.name ?? "Unnamed" }))
  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(org ? { org } : {}), ...extra })
    return `/super-admin/events?${p}`
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Events</h1>
          <p className="max-w-2xl text-[13px] text-ink-3">
            Every event on Ticketiv. &ldquo;Edit&rdquo; opens the organiser&apos;s own event editor, and &ldquo;Workspace&rdquo; the event&apos;s
            orders, tickets, staff and door tools, as an org admin sees them.{canEdit ? "" : " You have read-only access, so changes are blocked."}
          </p>
        </div>
        {canCreate ? (
          <Link href={qs({ new: "1" })} className="inline-flex min-h-[36px] items-center rounded-full border border-ink bg-ink px-4 text-[13px] font-semibold text-surface">
            Create an event
          </Link>
        ) : null}
      </div>

      {canCreate && params.new === "1" ? (
        <Panel title="Create an event" aside={<Link href={qs({})} className="text-accent hover:underline">Close</Link>}>
          <CreateEventForm action={createEventAction} organisations={organisations} defaultOrgId={org || undefined} />
          <p className="mt-3 text-[12px] text-ink-3">
            The event starts as a private draft. You&apos;ll go straight to its editor to add dates, venue, tickets and sponsors. Need a new
            organiser first?{" "}
            <Link href="/super-admin/organizations?new=1" className="font-semibold text-accent hover:underline">
              Create one
            </Link>
            .
          </p>
        </Panel>
      ) : null}

      <form className="flex flex-wrap gap-2" action="/super-admin/events">
        {org ? <input type="hidden" name="org" value={org} /> : null}
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by title"
          className="h-9 min-w-[220px] flex-1 rounded-md border border-line-2 bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <select name="status" defaultValue={status} className="h-9 rounded-md border border-line-2 bg-surface px-2 text-sm text-ink">
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md border border-line-2 bg-surface px-3 text-sm font-semibold text-ink hover:bg-bg">
          Filter
        </button>
        {org ? (
          <Link href="/super-admin/events" className="inline-flex h-9 items-center px-2 text-sm text-accent hover:underline">
            All organisers
          </Link>
        ) : null}
      </form>

      {error ? <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">Couldn&apos;t load events.</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-ink-3">No events match.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="flex min-w-[220px] flex-1 flex-col">
                  <Link href={`/super-admin/event/${e.id}`} className="truncate text-[14px] font-semibold text-ink hover:text-accent hover:underline">
                    {e.title ?? "Untitled event"}
                  </Link>
                  <span className="truncate text-[12px] text-ink-3">
                    <Link href={`/super-admin/organizer/${e.org_id}`} className="hover:underline">
                      {e.organizations?.name ?? "Organiser"}
                    </Link>
                    {" · "}
                    {e.starts_at ? when(e.starts_at) : "No date yet"}
                  </span>
                </div>
                <Pill tone={e.cancelled_at ? "danger" : TONE[e.status ?? ""] ?? "muted"}>{e.cancelled_at ? "Cancelled" : e.status ?? "draft"}</Pill>
                <div className="flex items-center gap-1.5">
                  {canEdit ? (
                    <Link href={`/orgs/${e.org_id}/events/${e.id}/edit`} className="rounded-md border border-line-2 px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-bg">
                      Edit
                    </Link>
                  ) : null}
                  <Link href={`/orgs/${e.org_id}/events/${e.id}`} className="rounded-md border border-line-2 px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-bg">
                    Workspace
                  </Link>
                  {e.status === "published" && e.visibility === "public" && e.slug ? (
                    <Link href={`/events/${e.slug}`} className="rounded-md px-2 py-1 text-[12px] font-semibold text-accent hover:underline">
                      Public page
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-[13px] text-ink-3">
        <span>
          {count ?? rows.length} event{(count ?? rows.length) === 1 ? "" : "s"}
        </span>
        <div className="flex gap-3">
          {page > 0 ? (
            <Link href={qs({ page: String(page - 1) })} className="font-semibold text-accent hover:underline">
              Previous
            </Link>
          ) : null}
          {count != null && (page + 1) * PAGE < count ? (
            <Link href={qs({ page: String(page + 1) })} className="font-semibold text-accent hover:underline">
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}
