import { MOCK_EVENTS } from "./mock-data"
import { calculatePricing, formatCurrency } from "./pricing"

export const getAllEvents = () => MOCK_EVENTS

export function getEventById(id: string) {
  return MOCK_EVENTS.find((event) => event.id === id)
}

export function getEventsByCategory(category: string) {
  return MOCK_EVENTS.filter((event) => event.category.toLowerCase() === category.toLowerCase())
}

export function getOrganizerEventMetrics() {
  return MOCK_EVENTS.map((event) => {
    const pricing = calculatePricing({ eventId: event.id, quantity: 1 })
    return {
      id: event.id,
      title: event.title,
      status: event.date >= new Date().toISOString().slice(0, 10) ? "Active" : "Archived",
      ticketsAvailable: event.ticketsAvailable,
      attendees: event.attendees,
      ticketPrice: pricing.total,
      formattedTicketPrice: formatCurrency(pricing.total),
    }
  })
}
