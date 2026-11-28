import Link from "next/link"

import { createOrganizerAction } from "@/app/super-admin/onboarding/actions"
import { CreateOrganizerForm } from "@/components/super-admin/OnboardingForms"
import { Panel, when } from "@/components/super-admin/console-ui"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { canDo, isUuid } from "@/lib/super-admin/console"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Organisers · Admin" }
export const dynamic = "force-dynamic"

const PAGE = 50

type Row = { id: string; name: string | null; slug: string | null; created_at: string | null; events: { count: number }[]; org_members: { count: number }[] }

/** Every organiser. The owner can create one and name its owner; any admin can open its workspace. */
export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; new?: string; created?: string }> }) {
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  const params = await searchParams
  const q = (params.q ?? "").trim().slice(0, 80)
  const page = Math.max(0, Number.parseInt(params.page ?? "0", 10) || 0)
  const canCreate = canDo("create_organizers_events", roleTier)
  const created = params.created && isUuid(params.created) ? params.created : null

  const admin = createAdminClient()
  let query = admin
    .from("organizations")
    .select("id, name, slug, created_at, events(count), org_members(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE, page * PAGE + PAGE - 1)
  if (q) query = query.ilike("name", `%${q.replace(/[%_,()]/g, "")}%`)
  const { data, count, error } = await query
  const rows = (data ?? []) as unknown as Row[]
  const qs = (extra: Record<string, string>) => `/super-admin/organizations?${new URLSearchParams({ ...(q ? { q } : {}), ...extra })}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Organisers</h1>
          <p className="max-w-2xl text-[13px] text-ink-3">
            Every organiser on Ticketiv. &ldquo;Workspace&rdquo; opens their dashboard as an org admin sees it; &ldquo;Events&rdquo; lists their
            events here.
          </p>
        </div>
        {canCreate ? (
          <Link href={qs({ new: "1" })} className="inline-flex min-h-[36px] items-center rounded-full border border-ink bg-ink px-4 text-[13px] font-semibold text-surface">
            Create an organiser
          </Link>
        ) : null}
      </div>

      {created ? (
        <p role="status" className="rounded-md bg-success-soft px-3 py-2 text-[13px] text-success">
          Organiser created and its owner emailed.{" "}
          <Link href={`/super-admin/events?new=1&org=${created}`} className="font-semibold underline">
            Create its first event
          </Link>
        </p>
      ) : null}

      {canCreate && params.new === "1" ? (
        <Panel title="Create an organiser" aside={<Link href={qs({})} className="text-accent hover:underline">Close</Link>}>
          <CreateOrganizerForm action={createOrganizerAction} />
        </Panel>
      ) : null}

      <form className="flex gap-2" action="/super-admin/organizations">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search organisers"
          className="h-9 flex-1 rounded-md border border-line-2 bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button type="submit" className="h-9 rounded-md border border-line-2 bg-surface px-3 text-sm font-semibold text-ink hover:bg-bg">
          Search
        </button>
      </form>

      {error ? <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">Couldn&apos;t load organisers.</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-ink-3">No organisers match.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((o) => {
              const events = o.events?.[0]?.count ?? 0
              const members = o.org_members?.[0]?.count ?? 0
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="flex min-w-[220px] flex-1 flex-col">
                    <Link href={`/super-admin/organizer/${o.id}`} className="truncate text-[14px] font-semibold text-ink hover:text-accent hover:underline">
                      {o.name ?? "Unnamed organiser"}
                    </Link>
                    <span className="text-[12px] text-ink-3">
                      {events} event{events === 1 ? "" : "s"} · {members} member{members === 1 ? "" : "s"} · since {when(o.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link href={`/super-admin/events?org=${o.id}`} className="rounded-md border border-line-2 px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-bg">
                      Events
                    </Link>
                    <Link href={`/orgs/${o.id}/dashboard`} className="rounded-md border border-line-2 px-2.5 py-1 text-[12px] font-semibold text-ink hover:bg-bg">
                      Workspace
                    </Link>
                    {canCreate ? (
                      <Link href={`/super-admin/events?new=1&org=${o.id}`} className="rounded-md px-2 py-1 text-[12px] font-semibold text-accent hover:underline">
                        New event
                      </Link>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between text-[13px] text-ink-3">
        <span>
          {count ?? rows.length} organiser{(count ?? rows.length) === 1 ? "" : "s"}
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
