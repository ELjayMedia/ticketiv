import { describe, expect, it } from "vitest";

import {
  MAX_CART_QUANTITY,
  cartQuantity,
  clampCart,
  parseCartParam,
  serializeCart,
  ticketTypeLimit,
} from "@/lib/checkout/cart";

const GA = "11111111-1111-1111-1111-111111111111";
const VIP = "22222222-2222-2222-2222-222222222222";
const PAUSED = "33333333-3333-3333-3333-333333333333";

const types = [
  { id: GA, remaining: 100, perUserLimit: null, perOrderLimit: 6 },
  { id: VIP, remaining: 2, perUserLimit: 4, perOrderLimit: null },
  { id: PAUSED, remaining: 50, perUserLimit: null, perOrderLimit: null, salesStatus: "paused" },
];

describe("cart param", () => {
  it("round-trips lines", () => {
    const lines = [
      { ticketTypeId: GA, quantity: 2 },
      { ticketTypeId: VIP, quantity: 1 },
    ];
    expect(parseCartParam(serializeCart(lines))).toEqual(lines);
  });

  it("merges duplicates and drops malformed parts", () => {
    expect(parseCartParam(`${GA}:1,${GA}:2,bad,${VIP}:0,${VIP}:x,:3,'drop':1`)).toEqual([
      { ticketTypeId: GA, quantity: 3 },
    ]);
  });

  it("treats missing params as an empty cart", () => {
    expect(parseCartParam(null)).toEqual([]);
    expect(parseCartParam("")).toEqual([]);
  });
});

describe("clampCart", () => {
  it("clamps each line to stock and configured limits", () => {
    expect(
      clampCart(
        [
          { ticketTypeId: GA, quantity: 9 },
          { ticketTypeId: VIP, quantity: 3 },
        ],
        types,
      ),
    ).toEqual([
      { ticketTypeId: GA, quantity: 6 },
      { ticketTypeId: VIP, quantity: 2 },
    ]);
  });

  it("drops unknown, paused and sold-out types", () => {
    expect(
      clampCart(
        [
          { ticketTypeId: "44444444-4444-4444-4444-444444444444", quantity: 1 },
          { ticketTypeId: PAUSED, quantity: 1 },
          { ticketTypeId: GA, quantity: 1 },
        ],
        [...types, { id: "44444444-4444-4444-4444-444444444444", remaining: 0, perUserLimit: null, perOrderLimit: null }],
      ),
    ).toEqual([{ ticketTypeId: GA, quantity: 1 }]);
  });

  it("caps the whole cart at the hold maximum", () => {
    const open = [
      { id: GA, remaining: null, perUserLimit: null, perOrderLimit: null },
      { id: VIP, remaining: null, perUserLimit: null, perOrderLimit: null },
    ];
    const clamped = clampCart(
      [
        { ticketTypeId: GA, quantity: 15 },
        { ticketTypeId: VIP, quantity: 15 },
      ],
      open,
    );
    expect(cartQuantity(clamped)).toBe(MAX_CART_QUANTITY);
    expect(clamped).toEqual([
      { ticketTypeId: GA, quantity: 15 },
      { ticketTypeId: VIP, quantity: 5 },
    ]);
  });
});

describe("ticketTypeLimit", () => {
  it("is zero for paused types and null when nothing caps it", () => {
    expect(ticketTypeLimit(types[2])).toBe(0);
    expect(ticketTypeLimit({ id: GA, remaining: null, perUserLimit: null, perOrderLimit: null })).toBeNull();
  });
});
