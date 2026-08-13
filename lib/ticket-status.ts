import type { MyTicketsView } from "@/lib/schemas/views"

export type TicketDisplayStatus =
  | "issued"
  | "checked_in"
  | "transferred"
  | "refunded"
  | "revoked"

/** Map live ticket state to the single status shown across web and native clients. */
export function ticketDisplayStatus(row: MyTicketsView): TicketDisplayStatus | "pending" {
  if (row.order_item_status === "refunded" || row.refunded_at) return "refunded"
  if (row.order_item_status === "revoked" || row.revoked_at) return "revoked"
  if (row.order_item_status === "transferred") return "transferred"
  if (row.order_item_status === "checked_in" || row.checked_in_at) return "checked_in"
  if (row.order_item_status === "issued") return "issued"
  return "pending"
}
