import Link from "next/link"
import { notFound } from "next/navigation"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { FieldHelpTooltip } from "@/components/super-admin/FieldHelpTooltip"
import { ResourceForm } from "@/components/super-admin/ResourceForm"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAdminResource } from "@/lib/super-admin/resources"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS, canMutateResource } from "@/lib/super-admin/permissions"
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
  return <Chip size="sm" variant="muted">{label.replaceAll("_", " ")}</Chip>
}

function HeaderCell({ column }: { column: string }) {
  return (
    <th className="px-3 py-3 text-left text-label">
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
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
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
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Super admin resource</p>
          <h1 className="text-h1">{friendlyName}</h1>
          <p className="text-[13px] text-ink-3">{resource.description}</p>
        </div>
      </div>

      {statusMessage ? (
        <div className="mb-5 flex items-center gap-2 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">
          <Icon name="check" size={14} /> {statusMessage}
        </div>
      ) : null}

      {!canMutate ? (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-ink-2">
          <Icon name="bell" size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-ink">Read-only access for this resource.</p>
            <p>
              Raw create/edit controls are hidden for your admin tier. Use the appropriate audited workflow actions where available.
            </p>
          </div>
        </div>
      ) : null}

      <section className={`grid gap-6 ${createColumnClass}`}>
        {canMutate ? (
          <Card>
            <CardBody className="px-5 py-4">
              <p className="inline-flex items-center gap-2 text-h3">
                <Icon name="plus" size={16} className="text-ink-3" />
                Create {friendlyName}
              </p>
            </CardBody>
            <CardDivider />
            <CardBody className="p-5">
              <ResourceForm
                resource={resource}
                action={createRecord}
                submitLabel={`Create ${friendlyName}`}
                lookups={lookups}
              />
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardBody className="px-5 py-4">
            <p className="text-h3">Latest {friendlyName}</p>
          </CardBody>
          <CardDivider />
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead>
                <tr className="border-b border-line">
                  {resource.listColumns.map((column) => (
                    <HeaderCell key={column} column={column} />
                  ))}
                  <th className="px-3 py-3 text-left text-label">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row) => {
                  const recordId = String(row[resource.primaryKey])
                  return (
                    <tr key={recordId} className="border-b border-line last:border-0">
                      {resource.listColumns.map((column) => {
                        const value = row[column]
                        return (
                          <td key={column} className="max-w-[240px] truncate px-3 py-3 text-ink">
                            {column === "status" || column === "sales_status" ? (
                              <StatusBadge value={value} />
                            ) : (
                              formatAdminCell(column, value, lookups)
                            )}
                          </td>
                        )
                      })}
                      <td className="px-3 py-3">
                        <Link
                          href={`/super-admin/${resource.key}/${recordId}`}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </section>
    </div>
  )
}
