// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export const DEMO_EVENTS: AnyRecord[] = []

export const DEMO_VENUES: AnyRecord[] = []

export const DEMO_TICKET_TYPES: AnyRecord[] = []

export const DEMO_ORDERS: AnyRecord[] = []

export const DEMO_ORDER_ITEMS: AnyRecord[] = []

export const DEMO_PAYMENTS: AnyRecord[] = []

export const DEMO_ARTISTS: AnyRecord[] = []

export const DEMO_ORGANISERS: AnyRecord[] = []

export function getDemoEventById(eventId: string) {
  const event = DEMO_EVENTS.find((e) => e.id === eventId)
  if (!event) return null

  const venue = DEMO_VENUES.find((v) => v.id === event.venue_id)
  const ticketTypes = DEMO_TICKET_TYPES.filter((t) => t.event_id === eventId)

  let artists: AnyRecord[] = []
  if (eventId === "demo-event-1") {
    artists = [DEMO_ARTISTS[0], DEMO_ARTISTS[1], DEMO_ARTISTS[5], DEMO_ARTISTS[6]]
  } else if (eventId === "demo-event-2") {
    artists = [DEMO_ARTISTS[2], DEMO_ARTISTS[3], DEMO_ARTISTS[4]]
  } else if (eventId === "demo-event-3") {
    artists = [DEMO_ARTISTS[7], DEMO_ARTISTS[8]]
  } else if (eventId === "demo-event-4") {
    artists = [DEMO_ARTISTS[9]]
  } else if (eventId === "demo-event-5") {
    artists = [DEMO_ARTISTS[10], DEMO_ARTISTS[0]]
  } else if (eventId === "demo-event-8") {
    artists = [DEMO_ARTISTS[5], DEMO_ARTISTS[6]]
  }

  return {
    ...event,
    venue,
    ticket_types: ticketTypes,
    artists,
  }
}

export function getDemoUserTickets(userId: string) {
  return DEMO_ORDER_ITEMS.filter((item) => {
    const order = DEMO_ORDERS.find((o) => o.id === item.order_id && o.buyer_id === userId)
    return !!order
  }).map((item) => {
    const event = DEMO_EVENTS.find((e) => e.id === item.event_id)
    const ticketType = DEMO_TICKET_TYPES.find((t) => t.id === item.ticket_type_id)
    return {
      ...item,
      event: event ? { title: event.title, starts_at: event.starts_at } : null,
      ticket_type: ticketType ? { name: ticketType.name, price: ticketType.price_cents } : null,
    }
  })
}

export function getDemoOrganizerEvents(orgId: string) {
  return DEMO_EVENTS.filter((e) => e.org_id === orgId).map((event) => {
    const orders = DEMO_ORDERS.filter((o) => o.event_id === event.id)
    const ticketTypes = DEMO_TICKET_TYPES.filter((t) => t.event_id === event.id)

    return {
      ...event,
      orders: { count: orders.length },
      ticket_types: { count: ticketTypes.length },
    }
  })
}

export function getDemoEventOrders(eventId: string) {
  return DEMO_ORDERS.filter((o) => o.event_id === eventId).map((order) => {
    const items = DEMO_ORDER_ITEMS.filter((i) => i.order_id === order.id)
    return {
      ...order,
      order_items: items,
    }
  })
}

export function getDemoOrganization(orgId: string) {
  return DEMO_ORGANISERS.find((org) => org.id === orgId) || null
}

export function getDemoTicketDetail(itemId: string) {
  const item = DEMO_ORDER_ITEMS.find((i) => i.id === itemId)
  if (!item) return null

  const event = DEMO_EVENTS.find((e) => e.id === item.event_id)
  const ticketType = DEMO_TICKET_TYPES.find((t) => t.id === item.ticket_type_id)
  const order = DEMO_ORDERS.find((o) => o.id === item.order_id)

  return {
    ...item,
    event,
    ticket_type: ticketType,
    order,
  }
}

export function getDemoOrganizerKpis() {
  const orders = DEMO_ORDERS.filter((o) => o.status === "completed")
  const items = DEMO_ORDER_ITEMS.filter((i) => orders.some((o) => o.id === i.order_id))

  return {
    events_count: DEMO_EVENTS.length,
    tickets_sold: items.length,
    gross_revenue_cents: orders.reduce((sum, o) => sum + (o.total_amount_cents || 0), 0),
    net_revenue_cents: orders.reduce(
      (sum, o) => sum + ((o.total_amount_cents || 0) - (o.fee_amount_cents || 0)),
      0,
    ),
    check_ins: items.filter((i) => i.checked_in_at).length,
    currency: "USD",
  }
}
