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
import type { AdminResource, AdminResourceField } from "@/lib/super-admin/resources"
import { buildAdminCreateDefaults, firstSearchParam, type AdminResourceSearchParams } from "@/lib/super-admin/form"
import { NO_HAND_CREATE, profileHrefFor, profileLabelFor } from "@/lib/super-admin/profile-links"
import { createResourceAction } from "../actions"

export async function generateMetadata({ params }: { params: Promise<{ resource: string }> }) {
  const { resource: resourceKey } = await params
  const resource = getAdminResource(resourceKey)
  return { title: resource ? `${getResourceFriendlyName(resource)} · Admin` : "Admin" }
}

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
    admin.from("profiles").select("user_id, display_name, name, phone").limit(500),
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
    users: new Map((profiles.data ?? []).map((row) => [
      String(row.user_id),
      String(row.display_name ?? row.name ?? row.phone ?? row.user_id),
    ])),
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

function getStateFilterField(resource: AdminResource): AdminResourceField | null {
  return resource.fields.find((field) => (
    field.type === "select" &&
    Array.isArray(field.options) &&
    (field.name === "status" || field.name === "inventory_status")
  )) ?? null
}

function sanitizeSearchTerm(value: string) {
  return value.replace(/[%_,]/g, " ").trim().replace(/\s+/g, "%")
}

function buildSearchClause(resource: AdminResource, searchTerm: string) {
  const normalized = sanitizeSearchTerm(searchTerm)
  if (!normalized || !resource.searchColumns?.length) return null
  return resource.searchColumns.map((column) => `${column}.ilike.%${normalized}%`).join(",")
}

export default async function SuperAdminResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ resource: string }>
  searchParams?: Promise<AdminResourceSearchParams>
}) {
  const { roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  const { resource: resourceKey } = await params
  const query = searchParams ? await searchParams : {}
  const resource = getAdminResource(resourceKey)

  if (!resource) notFound()

  const admin = createAdminClient()
  const activeResource = resource
  const searchTerm = firstSearchParam(query.q)?.trim() ?? ""
  const stateFilter = firstSearchParam(query.state)?.trim() ?? ""
  const stateFilterField = getStateFilterField(activeResource)
  const searchClause = buildSearchClause(activeResource, searchTerm)
  const canFilter = Boolean(activeResource.searchColumns?.length || stateFilterField)

  const selectColumns = activeResource.selectColumns?.join(",") ?? "*"
  let resourceQuery = admin.from(activeResource.table as any).select(selectColumns) as any
  if (searchClause) resourceQuery = resourceQuery.or(searchClause)
  if (stateFilter && stateFilterField?.options?.includes(stateFilter)) {
    resourceQuery = resourceQuery.eq(stateFilterField.name, stateFilter)
  }

  const [{ data, error }, lookups] = await Promise.all([
    resourceQuery.order(activeResource.orderBy, { ascending: false }).limit(50),
    getLookupMaps(),
  ])

  if (error) throw new Error(error.message)

  async function createRecord(formData: FormData) {
    "use server"
    await createResourceAction(activeResource.key, formData)
  }

  const status = firstSearchParam(query.status)
  const statusMessage = status ? STATUS_MESSAGES[status] : null
  const friendlyName = getResourceFriendlyName(resource)
  const canMutate = canMutateResource(resource.key, roleTier)
  const canHandCreate = canMutate && !NO_HAND_CREATE.has(resource.key)
  const profileLabel = profileLabelFor(resource.key)
  const createDefaults = buildAdminCreateDefaults(activeResource, query)
  const hasCreateDefaults = Object.keys(createDefaults).length > 0

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-ink-3">
            <Link href="/super-admin" className="text-accent hover:underline">Home</Link> / {profileLabel ? "Records" : "Data explorer"}
          </p>
          <h1 className="text-h1">{friendlyName}</h1>
          <p className="text-[13px] text-ink-3">{resource.description}</p>
        </div>
      </div>

      {statusMessage ? (
        <div className="mb-5 flex items-center gap-2 rounded-[var(--radius-md)] border border-success/30 bg-success/10 px-4 py-3 text-[13px] text-success">
          <Icon name="check" size={14} /> {statusMessage}
        </div>
      ) : null}

      {canFilter ? (
        <Card className="mb-5">
          <CardBody className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-end">
            {activeResource.searchColumns?.length ? (
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
                Search
                <input
                  name="q"
                  form="resource-filter-form"
                  defaultValue={searchTerm}
                  placeholder={`Serial, status or ${friendlyName.toLowerCase()} reference`}
                  className="h-10 rounded-full border border-line bg-surface px-4 text-[13px] font-normal text-ink outline-none transition focus:border-ink"
                />
              </label>
            ) : (
              <input name="q" form="resource-filter-form" type="hidden" value="" />
            )}

            {stateFilterField ? (
              <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink">
                {getFieldLabel(stateFilterField.name)}
                <select
                  name="state"
                  form="resource-filter-form"
                  defaultValue={stateFilter}
                  className="h-10 rounded-full border border-line bg-surface px-4 text-[13px] font-normal text-ink outline-none transition focus:border-ink"
                >
                  <option value="">All</option>
                  {stateFilterField.options?.map((option) => (
                    <option key={option} value={option}>{option.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </label>
            ) : (
              <input name="state" form="resource-filter-form" type="hidden" value="" />
            )}

            <form id="resource-filter-form" method="get" action={`/super-admin/${resource.key}`}>
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ink bg-ink px-4 text-[13px] font-semibold text-surface transition hover:bg-ink-2"
              >
                <Icon name="search" size={14} />
                Filter
              </button>
            </form>

            {searchTerm || stateFilter ? (
              <Link
                href={`/super-admin/${resource.key}`}
                className="inline-flex h-10 items-center justify-center rounded-full border border-line-2 bg-surface px-4 text-[13px] font-semibold text-ink transition hover:bg-bg"
              >
                Clear
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {!canMutate ? (
        <div className="mb-5 flex items-start gap-3 rounded-[var(--radius-md)] border border-warning/30 bg-warning/10 px-4 py-3 text-[13px] text-ink-2">
          <Icon name="bell" size={14} className="mt-0.5 shrink-0 text-warning" />
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-ink">You can look, not change.</p>
            <p>
              Editing these records by hand isn&apos;t part of your role. Use the fixes on the order, person or event pages instead, where every change asks why and is logged.
            </p>
          </div>
        </div>
      ) : null}

      <section>
        <Card>
          <CardBody className="px-5 py-4">
            <p className="text-h3">Latest {friendlyName.toLowerCase()}</p>
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
                {((data ?? []) as unknown as Record<string, unknown>[]).length ? ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
                  const recordId = String(row[resource.primaryKey])
                  const profileHref = profileHrefFor(resource.key, row)
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
                        <div className="flex flex-wrap items-center gap-2">
                          {profileHref ? (
                            <Link
                              href={profileHref}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                            >
                              {profileLabel}
                            </Link>
                          ) : null}
                          <Link
                            href={`/super-admin/${resource.key}/${recordId}?raw=1`}
                            className={
                              profileHref
                                ? "whitespace-nowrap text-[12px] text-ink-3 hover:text-ink hover:underline"
                                : "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius)] border border-line-2 bg-transparent px-3 py-1.5 text-[13px] font-semibold text-ink transition-colors hover:bg-bg"
                            }
                          >
                            {canMutate ? "Edit record" : "View record"}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                }) : (
                  <tr>
                    <td colSpan={resource.listColumns.length + 1} className="px-3 py-8 text-center text-[13px] text-ink-3">
                      No {friendlyName.toLowerCase()} records matched this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardBody>
        </Card>
      </section>

      {canHandCreate ? (
        <details className="group mt-6 rounded-[var(--radius-lg)] border border-line bg-surface" open={hasCreateDefaults}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="flex flex-col gap-0.5">
              <span className="inline-flex items-center gap-2 text-h3">
                <Icon name="plus" size={16} className="text-ink-3" />
                Add a record by hand
              </span>
              <span className="text-[12px] text-ink-3">
                {hasCreateDefaults
                  ? "Prefilled from readiness context. Review all values before creating the record."
                  : "For setup and fixes the normal screens don't cover. Most records are created by the app itself."}
              </span>
            </span>
            <Icon name="chevD" size={16} className="text-ink-3 transition-transform group-open:rotate-180" />
          </summary>
          <CardDivider />
          <div className="p-5">
            <ResourceForm
              resource={resource}
              defaults={createDefaults}
              action={createRecord}
              submitLabel="Create record"
              lookups={lookups}
            />
          </div>
        </details>
      ) : null}
    </div>
  )
}
