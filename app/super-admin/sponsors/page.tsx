import { updateSponsorAction } from "@/app/super-admin/sponsors/actions"
import { SponsorEditor } from "@/components/super-admin/SponsorEditor"
import { canDo } from "@/lib/super-admin/console"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"
import { createAdminClient } from "@/lib/supabase/admin"

export const metadata = { title: "Sponsors · Admin" }
export const dynamic = "force-dynamic"

type Row = { id: string; name: string; logo_url: string | null; website_url: string | null; created_at: string; event_sponsors: { count: number }[] }

/** The shared sponsor directory. Organisers add sponsors; only the owner changes them. */
export default async function SponsorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  const canEdit = canDo("manage_sponsors", roleTier)
  const q = ((await searchParams).q ?? "").trim().slice(0, 80)

  const db = createAdminClient() as unknown as { from: (t: string) => any }
  let query = db.from("sponsors").select("id, name, logo_url, website_url, created_at, event_sponsors(count)").order("name").limit(200)
  if (q) query = query.ilike("name", `%${q.replace(/[%_,()]/g, "")}%`)
  const { data, error } = await query
  const rows = (data ?? []) as Row[]

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Sponsors</h1>
        <p className="text-sm text-ink-3">
          One shared list, like venues. Organisers add sponsors from the event editor and can fill in a missing logo or website; only the
          Ticketiv owner can rename a sponsor or change its logo. Changes show on every event using the sponsor.
        </p>
      </div>
      <form className="flex gap-2" action="/super-admin/sponsors">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search sponsors"
          className="h-9 flex-1 rounded-md border border-line-2 bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
        />
        <button type="submit" className="h-9 rounded-md border border-line-2 bg-surface px-3 text-sm font-semibold text-ink hover:bg-bg">
          Search
        </button>
      </form>
      {error ? <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger">Couldn&apos;t load sponsors.</p> : null}
      {rows.length === 0 && !error ? <p className="text-sm text-ink-3">{q ? "No sponsors match." : "No sponsors yet."}</p> : null}
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <SponsorEditor
            key={r.id}
            sponsor={{ id: r.id, name: r.name, logoUrl: r.logo_url, websiteUrl: r.website_url, events: r.event_sponsors?.[0]?.count ?? 0 }}
            canEdit={canEdit}
            action={updateSponsorAction}
          />
        ))}
      </div>
    </div>
  )
}
