import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2, Plus, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldHelpTooltip } from "@/components/super-admin/FieldHelpTooltip"
import { ResourceForm } from "@/components/super-admin/ResourceForm"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireAdminRole } from "@/lib/super-admin/auth"
import {
  formatAdminCell,
  getFieldHelp,
  getFieldLabel,
  getResourceFriendlyName,
  type LookupMaps,
} from "@/lib/super-admin/display"
import { createResourceAction } from "../actions"

const STATUS_MESSAGES: Record<string, string> = {
  created: "Record created successfully.",
  updated: "Changes saved successfully.",
  deleted: "Record removed successfully.",
  published: "Event published successfully.",
  archived: "Event archived successfully.",
  ticket_updated: "Ticket sales status updated successfully.",
  device_updated: "Scanner assignment updated successfully.",
  finance_updated: "Finance status updated successfully.",
}

const ADMIN_ROLE_TIERS = ["super_admin", "finance_admin", "support_admin", "event_ops_admin", "read_only_admin"] as const

const FINANCE_RESOURCE_KEYS = new Set([
  "payments",
  "payment-attempts",
  "payouts",
  "payout-accounts",
  "refunds",
  "refund-items",
  "ledger-entries",
  "pricing-plans",
])

function canMutateResource(resourceKey: string, roleTier: string) {
  if (roleTier === "read_only_admin") return false
  if (FINANCE_RESOURCE_KEYS.has(resourceKey)) return roleTier === "super_admin"
  return true
}

function buildMap<T extends Record<string, unknown>>(rows: T[] | null, labelFor: (row: T) => string) {
  return new Map((rows ?? []).map((row) => [String(row.id), labelFor(row)]))
}

async function getLookupMaps(): Promise<LookupMaps> {
  const admin = createAdminClient()

  const [organizations, events, venues, ticketTypes, profiles, orders, payments, refunds, devices] = await Promise.all([
    admin.from("organizations").select("id, name, slug").limit(500),
    admin.from("events").select("id, title, starts_at").limit(500),
    admin.from("venues").select("id, name, city").limit(500),
    admin.from("ticket_types").select("id, name, price_cents, currency").limit(500),
    admin.from("profiles").select("id, email, full_name, phone").limit(500),
    admin.from("orders").select("id, buyer_email, total_cents, currency, status").limit(500),
    admin.from("payments").select("id, provider, amount_cents, currency, status").limit(500),
    admin.from("refunds").select("id, amount_cents, currency, status").limit(500),
    admin.from("devices").select("id, label, device_role").limit(500),
  ])

  return {
    organizations: buildMap(organizations.data, (row) => String(row.name ?? row.slug ?? row.id)),
    events: buildMap(events.data, (row) => String(row.title ?? row.id)),
    venues: buildMap(venues.data, (row) => `${row.name ?? row.id}${row.city ? ` · ${row.city}` : ""}`),
    ticketTypes: buildMap(ticketTypes.data, (row) => String(row.name ?? row.id)),
    users: buildMap(profiles.data, (row) => String(row.full_name ?? row.email ?? row.phone ?? row.id)),
    orders: buildMap(orders.data, (row) => `${row.buyer_email ?? "Order"} · ${row.status ?? "unknown"}`),
    payments: buildMap(payments.data, (row) => `${row.provider ?? "Payment"} · ${row.status ?? "unknown"}`),
    refunds: buildMap(refunds.data, (row) => `Refund · ${row.status ?? "unknown"}`),
    devices: buildMap(devices.data, (row) => String(row.label ?? row.device_role ?? row.id)),
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const label = String(value ?? "unknown")
  return <span className="inline-flex rounded-full border bg-muted/50 px-2 py-1 text-xs font-medium capitalize">{label.replaceAll("_", " ")}</span>
}

function HeaderCell({ column }: { column: string }) {
  return (
    <th className="px-3 py-3 font-medium">
      <span className="inline-flex items-center gap-1.5">
        {getFieldLabel(column)}
        <FieldHelpTooltip text={getFieldHelp(column)} />
      </span>
    </th>
  )
}

export default async function SuperAdminResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>
  searchParams?: Promise<{ status?: string }>
}) {
  const { roleTier } = await requireAdminRole([...ADMIN_ROLE_TIERS])
  const { resource: resourceKey } = await params
  const query = searchParams ? await searchParams : {}
  const resource = getAdminResource(resourceKey)

  if (!resource) notFound()

  const admin = createAdminClient()
  const [{ data, error }, lookups] = await Promise.all([
    admin.from(resource.table).select("*").order(resource.orderBy, { ascending: false }).limit(50),
    getLookupMaps(),
  ])

  if (error) throw new Error(error.message)

  async function createRecord(formData: FormData) {
    "use server"
    await createResourceAction(resource.key, formData)
  }

  const statusMessage = query.status ? STATUS_MESSAGES[query.status] : null
  const friendlyName = getResourceFriendlyName(resource)
  const canMutate = canMutateResource(resource.key, roleTier)
  const createColumnClass = canMutate ? "xl:grid-cols-[0.9fr_1.4fr]" : "xl:grid-cols-1"

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Super admin resource</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{friendlyName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{resource.description}</p>
        </div>
      </div>

      {statusMessage ? (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4" /> {statusMessage}
        </div>
      ) : null}

      {!canMutate ? (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Read-only access for this resource.</p>
            <p className="mt-1 text-amber-800">
              Raw create/edit controls are hidden for your admin tier. Finance users should use the audited finance workflow actions where available.
            </p>
          </div>
        </div>
      ) : null}

      <section className={`grid gap-6 ${createColumnClass}`}>
        {canMutate ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> Create {friendlyName}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResourceForm resource={resource} action={createRecord} submitLabel={`Create ${friendlyName}`} lookups={lookups} />
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base">Latest {friendlyName}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {resource.listColumns.map((column) => <HeaderCell key={column} column={column} />)}
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => {
                  const recordId = String(row[resource.primaryKey])
                  return (
                    <tr key={recordId} className="border-b last:border-0">
                      {resource.listColumns.map((column) => {
                        const value = row[column]
                        return (
                          <td key={column} className="max-w-[240px] truncate px-3 py-3">
                            {column === "status" || column === "sales_status" ? <StatusBadge value={value} /> : formatAdminCell(column, value, lookups)}
                          </td>
                        )
                      })}
                      <td className="px-3 py-3">
                        <Button asChild variant="outline" size="sm" className="rounded-full">
                          <Link href={`/super-admin/${resource.key}/${recordId}`}>Open</Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
