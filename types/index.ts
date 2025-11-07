export interface User {
  id: string
  email: string
  name?: string
  createdAt: string
}

export interface Artist {
  id: string
  name: string
  role: string
  image: string
  description?: string
}

export interface Venue {
  id: string
  name: string
  address: string
  city: string
  capacity: number
  amenities: string[]
  description?: string
}

export interface Event {
  id: string
  title: string
  description: string
  fullDescription: string
  date: string
  time: string
  endTime: string
  location: string
  venue: string
  venueDetails?: Venue
  artists?: Artist[]
  price: number
  image: string
  category: string
  attendees: number
  ticketsAvailable: number
}

export interface Ticket {
  id: string
  eventId: string
  eventTitle: string
  quantity: number
  total: number
  purchaseDate: string
  ticketNumber: string
}

export interface CartItem {
  eventId: string
  quantity: number
  price: number
}
