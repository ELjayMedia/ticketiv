import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { emailsFor } from "@/lib/data/admin/console"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"
import { auditRecordHref } from "@/lib/super-admin/profile-links"

export const metadata = { title: "Audit log · Admin" }

type AuditSearchParams = {
  table?: string
  action?: string
  actor?: string
  org?: string
  record?: string
  q?: string
  from?: string
  to?: string
}

// Audit `changes` are diffs/metadata written by our own code, but can carry
// PII (emails, holder details) and the odd token. Mask values whose key looks
// sensitive before rendering. Kept local so the page is self-contained.
const SENSITIVE_KEY = /(authorization|signature|secret|token|password|\bpan\b|card|cvv|\botp\b|api[_-]?key|\bkey\b|email|phone)/i

function redactChanges(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined || depth >= 6) return value
  if (Array.isArray(value)) return value.map((v) => redactChanges(v, depth + 1))
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redactChanges(v, depth + 1)
    }
    return out
  }
  return value
}

type AuditEntry = {
  id: string
  org_id: string | null
  actor_id: string | null
  table_name: string | null
  record_id: string | null
  action: string | null
  changes: unknown
  created_at: string | null
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-SZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatChanges(value: unknown) {
  if (!value) return "—"
  try {
    return JSON.stringify(redactChanges(value), null, 2)
  } catch {
    return String(value)
  }
}

function getBusinessAction(changes: unknown) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return null
  const value = (changes as Record<string, unknown>).business_action
  return typeof value === "string" ? value : null
}

function changesObject(changes: unknown): Record<string, unknown> | null {
  return changes && typeof changes === "object" && !Array.isArray(changes) ? (changes as Record<string, unknown>) : null
}

const TABLE_NOUN: Record<string, string> = {
  orders: "an order",
  order_items: "a ticket",
  payments: "a payment",
  refunds: "a refund",
  events: "an event",
  ticket_types: "a ticket type",
  event_staff: "event staff",
  organizations: "an organizer",
  org_members: "an organizer team",
  payouts: "a payout",
  admin_users: "an admin",
  "auth.users": "an account",
}

const ACTION_VERB: Record<string, string> = {
  insert: "Created",
  update: "Changed",
  delete: "Removed",
  login: "Signed in",
  logout: "Signed out",
  other: "Worked on",
}

/** One plain sentence for the entry: the summary we wrote, or verb + what. */
function describe(entry: AuditEntry): string {
  const changes = changesObject(entry.changes)
  if (typeof changes?.summary === "string" && changes.summary) return changes.summary
  const verb = ACTION_VERB[entry.action ?? "other"] ?? "Worked on"
  if (entry.action === "login" || entry.action === "logout") return verb
  const business = getBusinessAction(entry.changes)
  const noun = TABLE_NOUN[entry.table_name ?? ""] ?? (entry.table_name ? entry.table_name.replaceAll("_", " ") : "a record")
  return business ? `${verb} ${noun} (${business.replaceAll("_", " ")})` : `${verb} ${noun}`
}

function buildFilterHref(nextFilters: AuditSearchParams) {
  const params = new URLSearchParams()
  Object.entries(nextFilters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const query = params.toString()
  return query ? `/super-admin/audit?${query}` : "/super-admin/audit"
}

export default async function SuperAdminAuditPage({
  searchParams,
}: {
  searchParams?: Promise<AuditSearchParams>
}) {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const filters = searchParams ? await searchParams : {}
  const admin = createAdminClient()

  let query = admin
    .from("audit_log")
    .select("id, org_id, actor_id, table_name, record_id, action, changes, created_at")
    .order("created_at", { ascending: false })
    .limit(150)

  if (filters.table) query = query.eq("table_name", filters.table)
  if (filters.action) query = query.eq("action", filters.action as "insert" | "update" | "delete" | "login" | "logout" | "other")
  if (filters.actor) query = query.eq("actor_id", filters.actor)
  if (filters.org) query = query.eq("org_id", filters.org)
  if (filters.record) query = query.eq("record_id", filters.record)
  // Date range (inclusive). `to` is treated as end-of-day so a single date
  // picks the whole day.
  if (filters.from) query = query.gte("created_at", filters.from)
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const entries = (data ?? []) as AuditEntry[]
  const filteredData = entries.filter((entry) => {
    if (!filters.q) return true
    const needle = filters.q.toLowerCase()
    const haystack = [
      entry.table_name,
      entry.action,
      entry.record_id,
      entry.actor_id,
      entry.org_id,
      getBusinessAction(entry.changes),
      formatChanges(entry.changes),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
    return haystack.includes(needle)
  })

  const emails = await emailsFor(admin, filteredData.map((entry) => entry.actor_id))
  const orgIds = Array.from(new Set(filteredData.map((entry) => entry.org_id).filter((v): v is string => Boolean(v))))
  const { data: orgRows } = orgIds.length ? await admin.from("organizations").select("id, name").in("id", orgIds) : { data: [] }
  const orgNames = new Map((orgRows ?? []).map((org) => [org.id as string, org.name as string]))

  const activeFiltersCount = Object.values(filters).filter(Boolean).length
  const topTables = Array.from(new Set(entries.map((entry) => entry.table_name).filter(Boolean))).slice(0, 8)
  const topActions = Array.from(new Set(entries.map((entry) => entry.action).filter(Boolean))).slice(0, 8)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/super-admin"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] text-ink-3 underline-offset-4 hover:underline"
          >
            <Icon name="chevL" size={14} />
            Home
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-h1">Audit log</h1>
            <Chip size="sm" variant="muted">
              <Icon name="settings" size={12} /> {filteredData.length} shown
            </Chip>
            {activeFiltersCount ? (
              <Chip size="sm" variant="default">
                {activeFiltersCount} active filter{activeFiltersCount === 1 ? "" : "s"}
              </Chip>
            ) : null}
          </div>
          <p className="text-[13px] text-ink-3">
            Who changed what, when and why. Open an entry's record to see it as it is now.
          </p>
        </div>
        <Link
          href="/super-admin/exports/audit"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
        >
          <Icon name="download" size={14} />
          Export audit CSV
        </Link>
      </div>

      <Card className="mb-5">
        <CardBody className="flex flex-col gap-1 px-5 py-4">
          <p className="inline-flex items-center gap-2 text-h3">
            <Icon name="filter" size={16} className="text-ink-3" />
            Filters
          </p>
          <p className="text-[12px] text-ink-3">
            Click a name or organizer on any entry to see everything they did. The ID boxes take an exact ID from a profile page.
          </p>
        </CardBody>
        <CardDivider />
        <CardBody className="p-5">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FormField label="Search" name="q" defaultValue={filters.q ?? ""} placeholder="refund, an email, an order number" />
            <FormField label="Kind of record" name="table" defaultValue={filters.table ?? ""} placeholder="orders, events, refunds" />
            <FormField label="What happened" name="action" defaultValue={filters.action ?? ""} placeholder="insert, update, delete" />
            <FormField label="Record (exact ID)" name="record" defaultValue={filters.record ?? ""} placeholder="from a profile page" />
            <FormField label="Done by (person ID)" name="actor" defaultValue={filters.actor ?? ""} placeholder="from their profile" />
            <FormField label="Organizer (ID)" name="org" defaultValue={filters.org ?? ""} placeholder="from their profile" />
            <FormField label="From date" name="from" type="date" defaultValue={filters.from ?? ""} />
            <FormField label="To date" name="to" type="date" defaultValue={filters.to ?? ""} />
            <div className="flex gap-2 md:col-span-3 xl:col-span-6">
              <Button type="submit" variant="primary" size="md">
                Apply filters
              </Button>
              <Link
                href="/super-admin/audit"
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
              >
                Clear
              </Link>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {topTables.map((table) => (
              <Link
                key={table}
                href={buildFilterHref({ ...filters, table: table ?? undefined })}
                className="inline-flex items-center rounded-full border border-line-2 bg-surface px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink transition hover:bg-bg"
              >
                {TABLE_NOUN[table ?? ""]?.replace(/^(an?|the) /, "") ?? table?.replaceAll("_", " ")}
              </Link>
            ))}
            {topActions.map((action) => (
              <Link
                key={action}
                href={buildFilterHref({ ...filters, action: action ?? undefined })}
                className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3 transition hover:bg-bg hover:text-ink"
              >
                {ACTION_VERB[action ?? ""] ?? action}
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4">
        {filteredData.map((entry) => {
          const changes = changesObject(entry.changes)
          const reason = typeof changes?.reason === "string" && changes.reason ? changes.reason : null
          const recordHref = auditRecordHref(entry.table_name, entry.record_id, changes)
          const actorEmail = entry.actor_id ? emails.get(entry.actor_id) ?? null : null
          const orgName = entry.org_id ? orgNames.get(entry.org_id) ?? null : null
          return (
            <Card key={entry.id}>
              <CardBody className="flex flex-col gap-2 px-5 py-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="text-[15px] text-ink">
                      {entry.actor_id ? (
                        <Link href={`/super-admin/people/${entry.actor_id}`} className="font-semibold hover:text-accent hover:underline">
                          {actorEmail ?? "An admin"}
                        </Link>
                      ) : (
                        <span className="font-semibold">The platform</span>
                      )}
                      <span className="text-ink-2"> · {describe(entry)}</span>
                    </p>
                    {reason ? <p className="text-[13px] text-ink-2">Reason: {reason}</p> : null}
                    <p className="text-[12px] text-ink-3">
                      {formatDate(entry.created_at)}
                      {entry.org_id ? (
                        <>
                          {" · "}
                          <Link href={`/super-admin/organizer/${entry.org_id}`} className="hover:text-ink hover:underline">
                            {orgName ?? "Organizer"}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-3 text-[12px]">
                    {recordHref ? (
                      <Link href={recordHref} className="font-semibold text-accent hover:underline">
                        Open record →
                      </Link>
                    ) : null}
                    {entry.actor_id ? (
                      <Link href={buildFilterHref({ actor: entry.actor_id })} className="text-ink-3 hover:text-ink hover:underline">
                        More by them
                      </Link>
                    ) : null}
                  </div>
                </div>
                {entry.changes ? (
                  <details>
                    <summary className="cursor-pointer text-[12px] text-ink-3 hover:text-ink">Technical details</summary>
                    <p className="mt-2 font-mono text-[11px] text-ink-3">
                      {entry.table_name ?? "—"} · {entry.action ?? "—"} · record {entry.record_id ?? "—"}
                    </p>
                    <pre className="mt-2 max-h-72 overflow-auto rounded-[var(--radius-md)] bg-bg p-4 font-mono text-[11px] leading-relaxed text-ink-2">
                      {formatChanges(entry.changes)}
                    </pre>
                  </details>
                ) : null}
              </CardBody>
            </Card>
          )
        })}

        {!filteredData.length ? (
          <Card>
            <CardBody className="py-10 text-center text-[13px] text-ink-3">
              No audit entries found for the current filters.
            </CardBody>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
