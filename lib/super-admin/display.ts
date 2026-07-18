import type { AdminResource } from "@/lib/super-admin/resources"

export type LookupMaps = {
  organizations: Map<string, string>
  events: Map<string, string>
  venues: Map<string, string>
  ticketTypes: Map<string, string>
  users: Map<string, string>
  orders: Map<string, string>
  payments: Map<string, string>
  refunds: Map<string, string>
  devices: Map<string, string>
}

export const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  org_id: "Organization",
  event_id: "Event",
  venue_id: "Venue",
  artist_id: "Artist",
  ticket_type_id: "Ticket Type",
  order_id: "Order",
  order_item_id: "Ticket",
  payment_id: "Payment",
  refund_id: "Refund",
  payout_id: "Payout",
  device_id: "Device",
  batch_id: "Credential Batch",
  inventory_id: "Inventory Item",
  credential_id: "Credential",
  current_credential_id: "Current Credential",
  replacement_of_id: "Replacement Of",
  replaced_by_id: "Replaced By",
  user_id: "User",
  holder_user_id: "Holder",
  buyer_id: "Buyer",
  from_user_id: "From User",
  to_user_id: "To User",
  registered_by: "Registered By",
  primary_user_id: "Primary User",
  created_by: "Created By",
  updated_by: "Updated By",
  initiated_by: "Initiated By",
  issued_by: "Issued By",
  activated_by: "Activated By",
  revoked_by: "Revoked By",
  assigned_by: "Assigned By",
  removed_by: "Removed By",
  operator_user_id: "Operator",
  full_name: "Full Name",
  buyer_email: "Buyer Email",
  buyer_phone: "Buyer Phone",
  title: "Title",
  name: "Name",
  slug: "Slug",
  status: "Status",
  sales_status: "Sales Status",
  visibility: "Visibility",
  city: "City",
  starts_at: "Starts",
  ends_at: "Ends",
  created_at: "Created",
  updated_at: "Updated",
  paid_at: "Paid At",
  checked_in_at: "Checked In",
  last_seen_at: "Last Seen",
  expires_at: "Expires",
  amount_cents: "Amount",
  total_cents: "Total",
  price_cents: "Price",
  platform_fee_cents: "Platform Fee",
  platform_fixed_cents: "Platform Fixed Fee",
  processor_fixed_cents: "Processor Fixed Fee",
  platform_percent_bps: "Platform %",
  processor_percent_bps: "Processor %",
  currency: "Currency",
  quota: "Quota",
  allocation: "Allocation",
  channel: "Channel",
  provider: "Provider",
  ext_payment_id: "External Payment ID",
  destination_ref: "Destination Ref",
  device_role: "Device Role",
  ticket_code: "Ticket Code",
  holder_name: "Holder Name",
  holder_email: "Holder Email",
  holder_phone: "Holder Phone",
  public_serial: "Public Serial",
  qr_reference: "QR Reference",
  inventory_status: "Inventory Status",
  credential_public_id: "Credential Public ID",
  credential_type: "Credential Type",
  authentication_mode: "Authentication Mode",
  tap_type: "Tap Type",
  outcome: "Outcome",
  outlet_id: "Outlet",
  reason_code: "Reason Code",
}

export const FIELD_HELP: Record<string, string> = {
  org_id: "The organizer or company that owns this record.",
  event_id: "The event this record belongs to.",
  venue_id: "Where the event takes place.",
  ticket_type_id: "The ticket tier linked to this record, such as General or VIP.",
  order_id: "The customer order connected to this payment, ticket or refund.",
  buyer_id: "The customer profile that placed the order.",
  status: "The current operational state of this record.",
  sales_status: "Controls whether this ticket can currently be bought.",
  visibility: "Controls whether the event is public, unlisted or private.",
  quota: "The maximum number of tickets available for this tier.",
  per_user_limit: "The maximum number of tickets a single buyer can purchase.",
  channel: "Where this sale or ticket allocation came from, such as online, POS or reseller.",
  platform_percent_bps: "Platform percentage fee in basis points. 100 basis points equals 1%.",
  processor_percent_bps: "Payment processor percentage fee in basis points. 100 basis points equals 1%.",
  amount_cents: "Stored in cents for accounting accuracy, displayed here as money.",
  total_cents: "Stored in cents for accounting accuracy, displayed here as money.",
  price_cents: "Stored in cents for accounting accuracy, displayed here as money.",
  payout_id: "The payout record used for settlement to an organizer.",
  device_id: "The scanner, POS or kiosk device linked to this record.",
  public_serial: "The customer-safe printed or support serial, not a raw chip identifier.",
  qr_reference: "Opaque fallback QR reference. Do not embed user IDs, ticket codes or raw chip data.",
  inventory_status: "Physical TapBand stock state, from received through active, lost, revoked or destroyed.",
  credential_public_id: "Opaque credential handle used by clients and support flows.",
  credential_id: "The active credential record linked to inventory, entitlements or tap audit data.",
  inventory_id: "The physical TapBand inventory row associated with this credential record.",
  tap_type: "The operational context of a TapBand read, such as activation, outlet lookup or check-in.",
  outcome: "The result recorded by the TapBand service or reader.",
}

const RELATION_FIELDS: Record<string, keyof LookupMaps> = {
  org_id: "organizations",
  event_id: "events",
  venue_id: "venues",
  ticket_type_id: "ticketTypes",
  buyer_id: "users",
  user_id: "users",
  from_user_id: "users",
  to_user_id: "users",
  registered_by: "users",
  primary_user_id: "users",
  created_by: "users",
  initiated_by: "users",
  order_id: "orders",
  payment_id: "payments",
  refund_id: "refunds",
  device_id: "devices",
  holder_user_id: "users",
  issued_by: "users",
  activated_by: "users",
  revoked_by: "users",
  assigned_by: "users",
  removed_by: "users",
  operator_user_id: "users",
}

export function getFieldLabel(fieldName: string) {
  return FIELD_LABELS[fieldName] ?? titleCase(fieldName)
}

export function getFieldHelp(fieldName: string) {
  return FIELD_HELP[fieldName]
}

export function isRelationField(fieldName: string) {
  return fieldName in RELATION_FIELDS
}

export function getRelationMapName(fieldName: string) {
  return RELATION_FIELDS[fieldName]
}

export function formatAdminCell(column: string, value: unknown, lookups?: LookupMaps) {
  if (value === null || value === undefined || value === "") return "—"

  const relationMap = RELATION_FIELDS[column]
  if (relationMap && typeof value === "string") {
    const label = lookups?.[relationMap]?.get(value)
    return label ? `${label}` : shortId(value)
  }

  if (column.endsWith("_cents") && typeof value === "number") return formatMoney(value)
  if (column.endsWith("_bps") && typeof value === "number") return `${value / 100}%`
  if (column.endsWith("_at")) return formatDate(value)
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return "View details"
  if (typeof value === "string" && looksLikeUuid(value)) return shortId(value)
  return String(value)
}

export function getRelationOptions(fieldName: string, lookups?: LookupMaps) {
  const relationMap = RELATION_FIELDS[fieldName]
  if (!relationMap || !lookups) return []
  return Array.from(lookups[relationMap].entries()).map(([value, label]) => ({ value, label }))
}

export function getResourceFriendlyName(resource: AdminResource) {
  return resource.label.replace(/\bID\b/g, "").trim()
}

export function formatMoney(cents: number, currency = "SZL") {
  return new Intl.NumberFormat("en-SZ", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents ?? 0) / 100)
}

export function formatDate(value: unknown) {
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(date)
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1))
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function shortId(value: string) {
  if (!looksLikeUuid(value)) return value
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}
