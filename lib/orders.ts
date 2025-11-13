import { MOCK_EVENTS } from "./mock-data"
import { calculatePricing } from "./pricing"

export interface TicketRecord {
  code: string
  eventId: string
  scannedAt?: string
}

export interface OrderRecord {
  id: string
  eventId: string
  eventTitle: string
  attendeeName: string
  attendeeEmail: string
  quantity: number
  pricing: ReturnType<typeof calculatePricing>
  tickets: TicketRecord[]
  createdAt: string
}

export interface OrderInput {
  eventId: string
  quantity: number
  attendeeName: string
  attendeeEmail: string
}

const ORDER_STORE: Map<string, OrderRecord> = new Map()

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`
}

export async function createOrder(input: OrderInput): Promise<OrderRecord> {
  const event = MOCK_EVENTS.find((item) => item.id === input.eventId)
  if (!event) {
    throw new Error("Event not found")
  }

  const pricing = calculatePricing({ eventId: input.eventId, quantity: input.quantity })
  const tickets: TicketRecord[] = Array.from({ length: input.quantity }, (_, index) => ({
    code: generateId(`TICKET-${index + 1}`),
    eventId: input.eventId,
  }))

  const order: OrderRecord = {
    id: generateId("ORDER"),
    eventId: input.eventId,
    eventTitle: event.title,
    attendeeName: input.attendeeName,
    attendeeEmail: input.attendeeEmail,
    quantity: input.quantity,
    pricing,
    tickets,
    createdAt: new Date().toISOString(),
  }

  ORDER_STORE.set(order.id, order)
  return order
}

export function listOrders(): OrderRecord[] {
  return Array.from(ORDER_STORE.values())
}

export function getOrdersByEmail(email: string): OrderRecord[] {
  return listOrders().filter((order) => order.attendeeEmail.toLowerCase() === email.toLowerCase())
}

export function findTicketByCode(code: string): { order: OrderRecord; ticket: TicketRecord } | null {
  for (const order of ORDER_STORE.values()) {
    const ticket = order.tickets.find((item) => item.code === code)
    if (ticket) {
      return { order, ticket }
    }
  }
  return null
}

export function markTicketScanned(code: string): { order: OrderRecord; ticket: TicketRecord } | null {
  const match = findTicketByCode(code)
  if (!match) {
    return null
  }

  if (!match.ticket.scannedAt) {
    match.ticket.scannedAt = new Date().toISOString()
  }

  return match
}
