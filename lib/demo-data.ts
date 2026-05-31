// Demo data removed.
//
// This module intentionally exports inert placeholders temporarily so
// downstream imports can be migrated incrementally without breaking builds.
// All application flows should now source live Supabase data.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRecord = Record<string, any>

export const DEMO_EVENTS: AnyRecord[] = []
export const DEMO_VENUES: AnyRecord[] = []
export const DEMO_TICKET_TYPES: AnyRecord[] = []
export const DEMO_ORDERS: AnyRecord[] = []
export const DEMO_ORDER_ITEMS: AnyRecord[] = []
export const DEMO_PAYMENTS: AnyRecord[] = []
export const DEMO_ARTISTS: AnyRecord[] = []
export const DEMO_ORGANISERS: AnyRecord[] = []

export function getDemoEventById(): null {
  return null
}

export function getDemoUserTickets(): AnyRecord[] {
  return []
}

export function getDemoOrganizerEvents(): AnyRecord[] {
  return []
}

export function getDemoEventOrders(): AnyRecord[] {
  return []
}

export function getDemoOrganization(): null {
  return null
}

export function getDemoTicketDetail(): null {
  return null
}

export function getDemoOrganizerKpis() {
  return {
    events_count: 0,
    tickets_sold: 0,
    gross_revenue_cents: 0,
    net_revenue_cents: 0,
    check_ins: 0,
    currency: "SZL",
  }
}
