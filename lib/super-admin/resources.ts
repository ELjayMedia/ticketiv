export type AdminResourceFieldType = "text" | "number" | "select" | "datetime" | "boolean" | "uuid" | "json" | "readonly"

export type AdminResourceField = {
  name: string
  label: string
  type: AdminResourceFieldType
  required?: boolean
  readonly?: boolean
  options?: string[]
  placeholder?: string
}

export type AdminResource = {
  key: string
  label: string
  table: string
  primaryKey: string
  description: string
  orderBy: string
  fields: AdminResourceField[]
  listColumns: string[]
}

export const ADMIN_RESOURCES: AdminResource[] = [
  {
    key: "organizations",
    label: "Organizations",
    table: "organizations",
    primaryKey: "id",
    description: "Create and manage organizer/company accounts.",
    orderBy: "created_at",
    listColumns: ["name", "slug", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "readonly", readonly: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true, placeholder: "new-life-entertainment" },
      { name: "bio", label: "Bio", type: "text" },
      { name: "logo", label: "Logo URL", type: "text" },
    ],
  },
  {
    key: "venues",
    label: "Venues",
    table: "venues",
    primaryKey: "id",
    description: "Manage event venues and their city/capacity metadata.",
    orderBy: "created_at",
    listColumns: ["name", "city", "capacity"],
    fields: [
      { name: "id", label: "ID", type: "readonly", readonly: true },
      { name: "org_id", label: "Organization ID", type: "uuid", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "address", label: "Address", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "tz", label: "Timezone", type: "text", placeholder: "Africa/Mbabane" },
      { name: "capacity", label: "Capacity", type: "number" },
    ],
  },
  {
    key: "events",
    label: "Events",
    table: "events",
    primaryKey: "id",
    description: "Publish, archive and update marketplace events.",
    orderBy: "created_at",
    listColumns: ["title", "status", "city", "starts_at"],
    fields: [
      { name: "id", label: "ID", type: "readonly", readonly: true },
      { name: "org_id", label: "Organization ID", type: "uuid", required: true },
      { name: "venue_id", label: "Venue ID", type: "uuid", required: true },
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "status", label: "Status", type: "select", options: ["draft", "published", "archived"], required: true },
      { name: "visibility", label: "Visibility", type: "select", options: ["public", "unlisted", "private"], required: true },
      { name: "category", label: "Category", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "country_code", label: "Country Code", type: "text", placeholder: "SZ" },
      { name: "starts_at", label: "Starts At", type: "datetime" },
      { name: "ends_at", label: "Ends At", type: "datetime" },
      { name: "cover_image_url", label: "Cover Image URL", type: "text" },
      { name: "description", label: "Description", type: "text" },
    ],
  },
  {
    key: "ticket-types",
    label: "Ticket Types",
    table: "ticket_types",
    primaryKey: "id",
    description: "Control ticket tiers, quotas and prices.",
    orderBy: "created_at",
    listColumns: ["name", "price_cents", "currency", "quota"],
    fields: [
      { name: "id", label: "ID", type: "readonly", readonly: true },
      { name: "event_id", label: "Event ID", type: "uuid", required: true },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "price_cents", label: "Price (cents)", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text", required: true, placeholder: "SZL" },
      { name: "quota", label: "Quota", type: "number", required: true },
      { name: "per_user_limit", label: "Per User Limit", type: "number" },
      { name: "is_reserved_seating", label: "Reserved Seating", type: "boolean" },
    ],
  },
  {
    key: "orders",
    label: "Orders",
    table: "orders",
    primaryKey: "id",
    description: "Review and update checkout/order state.",
    orderBy: "created_at",
    listColumns: ["status", "total_cents", "currency", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "readonly", readonly: true },
      { name: "org_id", label: "Organization ID", type: "uuid", required: true },
      { name: "buyer_id", label: "Buyer ID", type: "uuid", required: true },
      { name: "status", label: "Status", type: "select", options: ["pending", "paid", "failed", "refunded"], required: true },
      { name: "total_cents", label: "Total (cents)", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text", required: true },
      { name: "channel", label: "Channel", type: "select", options: ["online", "pos", "reseller", "import"] },
      { name: "buyer_email", label: "Buyer Email", type: "text" },
      { name: "buyer_phone", label: "Buyer Phone", type: "text" },
    ],
  },
  {
    key: "payouts",
    label: "Payouts",
    table: "payouts",
    primaryKey: "id",
    description: "Manage payout status and settlement references.",
    orderBy: "created_at",
    listColumns: ["status", "amount_cents", "currency", "provider"],
    fields: [
      { name: "id", label: "ID", type: "readonly", readonly: true },
      { name: "org_id", label: "Organization ID", type: "uuid", required: true },
      { name: "amount_cents", label: "Amount (cents)", type: "number", required: true },
      { name: "currency", label: "Currency", type: "text", required: true },
      { name: "provider", label: "Provider", type: "text", required: true },
      { name: "destination_ref", label: "Destination Ref", type: "text" },
      { name: "status", label: "Status", type: "select", options: ["requested", "processing", "paid", "failed", "cancelled"], required: true },
      { name: "paid_at", label: "Paid At", type: "datetime" },
    ],
  },
  {
    key: "feature-flags",
    label: "Feature Flags",
    table: "feature_flags",
    primaryKey: "id",
    description: "Enable beta or premium features per organization.",
    orderBy: "created_at",
    listColumns: ["key", "enabled", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "readonly", readonly: true },
      { name: "org_id", label: "Organization ID", type: "uuid", required: true },
      { name: "key", label: "Key", type: "text", required: true },
      { name: "enabled", label: "Enabled", type: "boolean" },
      { name: "config", label: "Config JSON", type: "json", placeholder: "{}" },
    ],
  },
]

export function getAdminResource(key: string) {
  return ADMIN_RESOURCES.find((resource) => resource.key === key)
}
