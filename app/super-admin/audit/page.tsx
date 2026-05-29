import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

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
  if (filters.action) query = query.eq("action", filters.action)
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
            Back to Command Centre
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
            Search and review admin, finance, organizer and system-level changes across Ticketiv.
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
            Use exact identifiers for actor, org or record when investigating a specific issue.
          </p>
        </CardBody>
        <CardDivider />
        <CardBody className="p-5">
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FormField label="Search" name="q" defaultValue={filters.q ?? ""} placeholder="business action, JSON, ID" />
            <FormField label="Table/entity" name="table" defaultValue={filters.table ?? ""} placeholder="events" />
            <FormField label="Action" name="action" defaultValue={filters.action ?? ""} placeholder="update" />
            <FormField label="Record ID" name="record" defaultValue={filters.record ?? ""} placeholder="uuid or text id" />
            <FormField label="Actor ID" name="actor" defaultValue={filters.actor ?? ""} placeholder="user uuid" />
            <FormField label="Org ID" name="org" defaultValue={filters.org ?? ""} placeholder="org uuid" />
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
                {table}
              </Link>
            ))}
            {topActions.map((action) => (
              <Link
                key={action}
                href={buildFilterHref({ ...filters, action: action ?? undefined })}
                className="inline-flex items-center rounded-full bg-surface-2 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-3 transition hover:bg-bg hover:text-ink"
              >
                {action}
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4">
        {filteredData.map((entry) => {
          const businessAction = getBusinessAction(entry.changes)
          return (
            <Card key={entry.id}>
              <CardBody className="flex flex-col gap-3 px-5 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-h3">{entry.table_name} · {entry.action}</p>
                      {businessAction ? (
                        <Chip size="sm" variant="active">{businessAction.replaceAll("_", " ")}</Chip>
                      ) : null}
                    </div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {formatDate(entry.created_at)} · Record {entry.record_id ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3 md:text-right">
                    <Link
                      href={buildFilterHref({ ...filters, actor: entry.actor_id ?? undefined })}
                      className="hover:text-ink"
                    >
                      Actor · {entry.actor_id ?? "system"}
                    </Link>
                    <Link
                      href={buildFilterHref({ ...filters, org: entry.org_id ?? undefined })}
                      className="hover:text-ink"
                    >
                      Org · {entry.org_id ?? "platform"}
                    </Link>
                  </div>
                </div>
              </CardBody>
              <CardDivider />
              <CardBody className="p-5">
                <pre className="max-h-72 overflow-auto rounded-[var(--radius-md)] bg-bg p-4 font-mono text-[11px] leading-relaxed text-ink-2">
                  {formatChanges(entry.changes)}
                </pre>
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
