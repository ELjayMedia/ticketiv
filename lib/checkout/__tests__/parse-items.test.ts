import { describe, expect, it } from "vitest"

import { MAX_CHECKOUT_ITEM_QUANTITY, MAX_CHECKOUT_LINE_ITEMS, parseCheckoutItems } from "../parse-items"

const A = "11111111-1111-4111-8111-111111111111"
const B = "22222222-2222-4222-8222-222222222222"

describe("parseCheckoutItems", () => {
  it("accepts well-formed items in either id shape", () => {
    expect(parseCheckoutItems([{ ticketTypeId: A, quantity: 2 }])).toEqual({
      ok: true,
      items: [{ ticketTypeId: A, quantity: 2 }],
    })
    expect(parseCheckoutItems([{ ticket_type_id: B, quantity: "3" }], "ticket_type_id")).toEqual({
      ok: true,
      items: [{ ticketTypeId: B, quantity: 3 }],
    })
  })

  it("rejects empty, non-array and oversized carts", () => {
    expect(parseCheckoutItems([]).ok).toBe(false)
    expect(parseCheckoutItems(null).ok).toBe(false)
    expect(parseCheckoutItems({ ticketTypeId: A, quantity: 1 }).ok).toBe(false)
    const many = Array.from({ length: MAX_CHECKOUT_LINE_ITEMS + 1 }, () => ({ ticketTypeId: A, quantity: 1 }))
    expect(parseCheckoutItems(many)).toEqual({ ok: false, error: "Too many line items" })
  })

  it.each([0, -1, 1.5, Number.NaN, Infinity, "abc", null])("rejects quantity %s", (quantity) => {
    expect(parseCheckoutItems([{ ticketTypeId: A, quantity }]).ok).toBe(false)
  })

  it("rejects ids that are not UUIDs", () => {
    expect(parseCheckoutItems([{ ticketTypeId: "undefined", quantity: 1 }]).ok).toBe(false)
    expect(parseCheckoutItems([{ ticketTypeId: `${A},${B}`, quantity: 1 }]).ok).toBe(false)
  })

  it("merges repeated ticket types so the quantity cap cannot be split around", () => {
    expect(parseCheckoutItems([{ ticketTypeId: A, quantity: 1 }, { ticketTypeId: A, quantity: 2 }])).toEqual({
      ok: true,
      items: [{ ticketTypeId: A, quantity: 3 }],
    })
    const half = Math.ceil(MAX_CHECKOUT_ITEM_QUANTITY / 2) + 1
    expect(parseCheckoutItems([{ ticketTypeId: A, quantity: half }, { ticketTypeId: A, quantity: half }]).ok).toBe(false)
  })
})
