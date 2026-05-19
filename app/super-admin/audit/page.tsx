import Link from "next/link"
import { ArrowLeft, Download, Filter, Search, ShieldCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function getBusinessAction(changes: unknown) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return null
  const value = (changes as Record<string, unknown>).business_action
  return typeof value === "string" ? value : null
}

function applySearchFilters(query: ReturnType<ReturnType<typeof createAdminClient>["from"]>["select"], filters: AuditSearchParams) {
  let scopedQuery = query

  if (filters.table) scopedQuery = scopedQuery.eq("table_name", filters.table)
  if (filters.action) scopedQuery = scopedQuery.eq("action", filters.action)
  if (filters.actor) scopedQuery = scopedQuery.eq("actor_id", filters.actor)
  if (filters.org) scopedQuery = scopedQuery.eq("org_id", filters.org)
  if (filters.record) scopedQuery = scopedQuery.eq("record_id", filters.record)

  return scopedQuery
}

function buildFilterHref(nextFilters: AuditSearchParams) {
  const params = new URLSearchParams()
  Object.entries(nextFilters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const query = params.toString()
  return query ? `/super-admin/audit?${query}` : "/super-admin/audit"
}

export default async function SuperAdminAuditPage({ searchParams }: { searchParams?: Promise<AuditSearchParams> }) {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const filters = searchParams ? await searchParams : {}
  const admin = createAdminClient()

  const baseQuery = admin
    .from("audit_log")
    .select("id, org_id, actor_id, table_name, record_id, action, changes, created_at")
    .order("created_at", { ascending: false })
    .limit(150)

  const { data, error } = await applySearchFilters(baseQuery, filters)

  if (error) throw new Error(error.message)

  const filteredData = (data ?? []).filter((entry) => {
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
  const topTables = Array.from(new Set((data ?? []).map((entry) => entry.table_name).filter(Boolean))).slice(0, 8)
  const topActions = Array.from(new Set((data ?? []).map((entry) => entry.action).filter(Boolean))).slice(0, 8)

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button asChild variant="ghost" className="mb-3 rounded-full px-0 hover:bg-transparent">
            <Link href="/super-admin"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Command Centre</Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
            <Badge variant="secondary" className="gap-1"><ShieldCheck className="h-3 w-3" /> {filteredData.length} shown</Badge>
            {activeFiltersCount ? <Badge variant="outline">{activeFiltersCount} active filter{activeFiltersCount === 1 ? "" : "s"}</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Search and review admin, finance, organizer and system-level changes across Ticketiv.</p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/super-admin/exports/audit"><Download className="mr-2 h-4 w-4" /> Export audit CSV</Link>
        </Button>
      </div>

      <Card className="mb-5 rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" /> Filters</CardTitle>
          <CardDescription>Use exact identifiers for actor, org or record when investigating a specific issue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="q">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input id="q" name="q" defaultValue={filters.q ?? ""} placeholder="business action, JSON, ID" className="pl-9" />
              </div>
            </div>
            <div className="space-y-2"><Label htmlFor="table">Table/entity</Label><Input id="table" name="table" defaultValue={filters.table ?? ""} placeholder="events" /></div>
            <div className="space-y-2"><Label htmlFor="action">Action</Label><Input id="action" name="action" defaultValue={filters.action ?? ""} placeholder="update" /></div>
            <div className="space-y-2"><Label htmlFor="record">Record ID</Label><Input id="record" name="record" defaultValue={filters.record ?? ""} placeholder="uuid or text id" /></div>
            <div className="space-y-2"><Label htmlFor="actor">Actor ID</Label><Input id="actor" name="actor" defaultValue={filters.actor ?? ""} placeholder="user uuid" /></div>
            <div className="space-y-2"><Label htmlFor="org">Org ID</Label><Input id="org" name="org" defaultValue={filters.org ?? ""} placeholder="org uuid" /></div>
            <div className="flex gap-2 md:col-span-3 xl:col-span-6">
              <Button type="submit" className="rounded-full">Apply filters</Button>
              <Button asChild type="button" variant="outline" className="rounded-full"><Link href="/super-admin/audit">Clear</Link></Button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {topTables.map((table) => <Button key={table} asChild size="sm" variant="outline" className="rounded-full"><Link href={buildFilterHref({ ...filters, table })}>{table}</Link></Button>)}
            {topActions.map((action) => <Button key={action} asChild size="sm" variant="secondary" className="rounded-full"><Link href={buildFilterHref({ ...filters, action })}>{action}</Link></Button>)}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {filteredData.map((entry) => {
          const businessAction = getBusinessAction(entry.changes)
          return (
            <Card key={entry.id} className="rounded-3xl">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{entry.table_name} · {entry.action}</CardTitle>
                      {businessAction ? <Badge>{businessAction.replaceAll("_", " ")}</Badge> : null}
                    </div>
                    <CardDescription className="mt-1">{formatDate(entry.created_at)} · Record {entry.record_id ?? "—"}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground md:text-right">
                    <Link href={buildFilterHref({ ...filters, actor: entry.actor_id ?? undefined })} className="hover:text-foreground">Actor: {entry.actor_id ?? "system"}</Link>
                    <Link href={buildFilterHref({ ...filters, org: entry.org_id ?? undefined })} className="hover:text-foreground">Org: {entry.org_id ?? "platform"}</Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="max-h-72 overflow-auto rounded-2xl bg-muted p-4 text-xs leading-relaxed">
                  {formatChanges(entry.changes)}
                </pre>
              </CardContent>
            </Card>
          )
        })}

        {!filteredData.length ? (
          <Card className="rounded-3xl">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">No audit entries found for the current filters.</CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  )
}
