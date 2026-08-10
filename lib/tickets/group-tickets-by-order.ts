export interface TicketOrderGroupingItem {
  ticketId: string;
  orderId: string;
}

export interface TicketOrderGroup<T extends TicketOrderGroupingItem> {
  orderId: string;
  tickets: T[];
}

/**
 * Groups independently scannable tickets by their originating order while
 * preserving both order and ticket sequence. The UI can collapse duplicate
 * event chrome without ever collapsing the individual ticket identities.
 */
export function groupTicketsByOrder<T extends TicketOrderGroupingItem>(
  tickets: readonly T[],
): TicketOrderGroup<T>[] {
  const groups = new Map<string, TicketOrderGroup<T>>();

  for (const ticket of tickets) {
    const existing = groups.get(ticket.orderId);
    if (existing) {
      existing.tickets.push(ticket);
      continue;
    }

    groups.set(ticket.orderId, {
      orderId: ticket.orderId,
      tickets: [ticket],
    });
  }

  return Array.from(groups.values());
}
