import { describe, expect, it } from "vitest";

import { groupTicketsByOrder } from "@/lib/tickets/group-tickets-by-order";

describe("groupTicketsByOrder", () => {
  it("groups tickets from the same order without losing ticket identity", () => {
    const result = groupTicketsByOrder([
      { orderId: "order-a", ticketId: "ticket-1", label: "General" },
      { orderId: "order-a", ticketId: "ticket-2", label: "VIP" },
      { orderId: "order-b", ticketId: "ticket-3", label: "General" },
    ]);

    expect(result).toEqual([
      {
        orderId: "order-a",
        tickets: [
          { orderId: "order-a", ticketId: "ticket-1", label: "General" },
          { orderId: "order-a", ticketId: "ticket-2", label: "VIP" },
        ],
      },
      {
        orderId: "order-b",
        tickets: [
          { orderId: "order-b", ticketId: "ticket-3", label: "General" },
        ],
      },
    ]);
  });

  it("preserves first-seen order and does not mutate the source array", () => {
    const source = [
      { orderId: "order-b", ticketId: "ticket-3" },
      { orderId: "order-a", ticketId: "ticket-1" },
      { orderId: "order-b", ticketId: "ticket-4" },
    ] as const;

    const result = groupTicketsByOrder(source);

    expect(result.map((group) => group.orderId)).toEqual(["order-b", "order-a"]);
    expect(result[0].tickets.map((ticket) => ticket.ticketId)).toEqual([
      "ticket-3",
      "ticket-4",
    ]);
    expect(source).toHaveLength(3);
  });
});
