export const DEMO_EVENTS = [
  {
    id: "demo-event-1",
    org_id: "demo-org-1",
    title: "Summer Music Festival 2024",
    slug: "summer-music-festival-2024",
    description: "The biggest summer music festival featuring top artists from around the world",
    full_description:
      "Join us for an unforgettable experience with world-class performances, amazing food, and incredible vibes. This year's lineup includes headliners across multiple genres.",
    status: "published",
    visibility: "public",
    category: "Music",
    cover_image_url: "/placeholder.svg?height=400&width=600",
    banner_image_url: "/placeholder.svg?height=600&width=1200",
    starts_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
    timezone: "America/New_York",
    venue_id: "demo-venue-1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "demo-event-2",
    org_id: "demo-org-1",
    title: "Tech Conference 2024",
    slug: "tech-conference-2024",
    description: "Annual technology conference bringing together industry leaders and innovators",
    status: "published",
    visibility: "public",
    category: "Conference",
    cover_image_url: "/placeholder.svg?height=400&width=600",
    starts_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    timezone: "America/Los_Angeles",
    venue_id: "demo-venue-2",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const DEMO_VENUES = [
  {
    id: "demo-venue-1",
    name: "Central Park Arena",
    address_line1: "123 Park Avenue",
    city: "New York",
    state: "NY",
    country: "USA",
    postal_code: "10001",
    capacity: 50000,
    description: "Iconic outdoor venue in the heart of the city",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-venue-2",
    name: "Tech Convention Center",
    address_line1: "456 Innovation Drive",
    city: "San Francisco",
    state: "CA",
    country: "USA",
    postal_code: "94102",
    capacity: 5000,
    created_at: new Date().toISOString(),
  },
]

export const DEMO_TICKET_TYPES = [
  {
    id: "demo-ticket-1",
    event_id: "demo-event-1",
    name: "General Admission",
    description: "Standard access to all festival areas",
    price_cents: 12900,
    currency: "USD",
    quantity_total: 10000,
    quantity_remaining: 8500,
    is_active: true,
    per_user_limit: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-ticket-2",
    event_id: "demo-event-1",
    name: "VIP Pass",
    description: "Premium access with backstage privileges",
    price_cents: 29900,
    currency: "USD",
    quantity_total: 500,
    quantity_remaining: 150,
    is_active: true,
    per_user_limit: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-ticket-3",
    event_id: "demo-event-2",
    name: "Early Bird",
    description: "Discounted early access tickets",
    price_cents: 19900,
    currency: "USD",
    quantity_total: 200,
    quantity_remaining: 50,
    is_active: true,
    created_at: new Date().toISOString(),
  },
]

export const DEMO_ORDERS = [
  {
    id: "demo-order-1",
    event_id: "demo-event-1",
    buyer_id: "demo-user-attendee",
    purchaser_email: "demo@ticketiv.com",
    purchaser_first_name: "Demo",
    purchaser_last_name: "Attendee",
    status: "completed",
    total_amount_cents: 12900,
    currency: "USD",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const DEMO_ORDER_ITEMS = [
  {
    id: "demo-item-1",
    order_id: "demo-order-1",
    event_id: "demo-event-1",
    ticket_type_id: "demo-ticket-1",
    quantity: 2,
    unit_price_cents: 12900,
    total_amount_cents: 25800,
    ticket_code: "DEMO-TICKET-001",
    checked_in_at: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const DEMO_PAYMENTS = [
  {
    id: "demo-payment-1",
    order_id: "demo-order-1",
    amount_cents: 12900,
    currency: "USD",
    status: "succeeded",
    provider: "stripe",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export const DEMO_ARTISTS = [
  {
    id: "demo-artist-1",
    name: "The Electric Vibes",
    bio: "Electronic music duo pushing boundaries",
    avatar_url: "/placeholder.svg?height=200&width=200&text=EV",
    genre: "Electronic",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-artist-2",
    name: "Sarah Johnson",
    bio: "Award-winning indie folk artist",
    avatar_url: "/placeholder.svg?height=200&width=200&text=SJ",
    genre: "Folk",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-speaker-1",
    name: "Dr. Michael Chen",
    bio: "AI researcher and keynote speaker on machine learning innovations",
    avatar_url: "/placeholder.svg?height=200&width=200&text=MC",
    role: "Keynote Speaker",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-speaker-2",
    name: "Emily Rodriguez",
    bio: "Tech entrepreneur and founder of multiple successful startups",
    avatar_url: "/placeholder.svg?height=200&width=200&text=ER",
    role: "Panel Speaker",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-speaker-3",
    name: "James Patterson",
    bio: "Cloud computing expert and author",
    avatar_url: "/placeholder.svg?height=200&width=200&text=JP",
    role: "Workshop Leader",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-artist-3",
    name: "Luna Martinez",
    bio: "Rising pop sensation with chart-topping hits",
    avatar_url: "/placeholder.svg?height=200&width=200&text=LM",
    genre: "Pop",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-artist-4",
    name: "The Jazz Collective",
    bio: "Contemporary jazz ensemble blending traditional and modern styles",
    avatar_url: "/placeholder.svg?height=200&width=200&text=JC",
    genre: "Jazz",
    created_at: new Date().toISOString(),
  },
]

export function getDemoEventById(eventId: string) {
  const event = DEMO_EVENTS.find((e) => e.id === eventId)
  if (!event) return null

  const venue = DEMO_VENUES.find((v) => v.id === event.venue_id)
  const ticketTypes = DEMO_TICKET_TYPES.filter((t) => t.event_id === eventId)

  let artists = []
  if (eventId === "demo-event-1") {
    artists = [DEMO_ARTISTS[0], DEMO_ARTISTS[1], DEMO_ARTISTS[5], DEMO_ARTISTS[6]]
  } else if (eventId === "demo-event-2") {
    artists = [DEMO_ARTISTS[2], DEMO_ARTISTS[3], DEMO_ARTISTS[4]]
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
