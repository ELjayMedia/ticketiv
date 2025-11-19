import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { fetchOrdersForCurrentUser } from "../lib/api/orders/get-orders-handler"
import type { OrderRecord } from "../lib/orders"

type SupabaseUser = {
  email?: string | null
  app_metadata?: { role?: string }
  user_metadata?: { role?: string }
}

type GetUserResult = {
  data: { user: SupabaseUser | null }
  error: Error | null
}

function createSupabaseMock(result: GetUserResult) {
  return {
    auth: {
      getUser: async () => result,
    },
  }
}

describe("fetchOrdersForCurrentUser", () => {
  it("rejects unauthenticated callers", async () => {
    const result = await fetchOrdersForCurrentUser(
      createSupabaseMock({ data: { user: null }, error: null }) as any,
      {
        fetchOrders: () => {
          throw new Error("should not be called")
        },
      },
    )

    assert.equal(result.status, 401)
    assert.deepEqual(result.body, { error: "Unauthorized" })
  })

  it("returns sanitized orders for the authenticated attendee", async () => {
    const userEmail = "attendee@example.com"
    const mockOrder: OrderRecord = {
      id: "order-1",
      eventId: "event-1",
      eventTitle: "Sample Event",
      attendeeName: "Attendee",
      attendeeEmail: userEmail,
      quantity: 1,
      pricing: { subtotal: 50, fees: 5, total: 55, currency: "USD" },
      tickets: [{ code: "ticket-abc", eventId: "event-1" }],
      createdAt: new Date().toISOString(),
    }

    const result = await fetchOrdersForCurrentUser(
      createSupabaseMock({ data: { user: { email: userEmail } }, error: null }) as any,
      {
        fetchOrders: (email) => {
          assert.equal(email, userEmail)
          return [mockOrder]
        },
      },
    )

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, {
      orders: [
        {
          id: mockOrder.id,
          eventId: mockOrder.eventId,
          eventTitle: mockOrder.eventTitle,
          attendeeName: mockOrder.attendeeName,
          attendeeEmail: mockOrder.attendeeEmail,
          quantity: mockOrder.quantity,
          pricing: mockOrder.pricing,
          createdAt: mockOrder.createdAt,
        },
      ],
    })
  })

  it("returns full order data for organizers", async () => {
    const mockOrders: OrderRecord[] = [
      {
        id: "order-1",
        eventId: "event-1",
        eventTitle: "Sample Event",
        attendeeName: "Attendee",
        attendeeEmail: "attendee@example.com",
        quantity: 2,
        pricing: { subtotal: 100, fees: 10, total: 110, currency: "USD" },
        tickets: [
          { code: "ticket-1", eventId: "event-1" },
          { code: "ticket-2", eventId: "event-1" },
        ],
        createdAt: new Date().toISOString(),
      },
    ]

    const result = await fetchOrdersForCurrentUser(
      createSupabaseMock({
        data: { user: { email: "organizer@example.com", app_metadata: { role: "organizer" } } },
        error: null,
      }) as any,
      {
        fetchOrders: () => {
          throw new Error("attendee fetch should not be called for organizers")
        },
        fetchAllOrders: () => mockOrders,
      },
    )

    assert.equal(result.status, 200)
    assert.deepEqual(result.body, { orders: mockOrders })
  })
})
