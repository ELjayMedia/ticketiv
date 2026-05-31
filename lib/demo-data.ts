export const DEMO_EVENTS = []
export const DEMO_VENUES = []
export const DEMO_TICKET_TYPES = []
export const DEMO_ORDERS = []
export const DEMO_ORDER_ITEMS = []
export const DEMO_PAYMENTS = []
export const DEMO_ARTISTS = []
export const DEMO_ORGANISERS = []

export function getDemoEventById() { return null }
export function getDemoUserTickets() { return [] }
export function getDemoOrganizerEvents() { return [] }
export function getDemoEventOrders() { return [] }
export function getDemoOrganization() { return null }
export function getDemoTicketDetail() { return null }
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
