export interface TicketCheckIn {
  ticketId: string
  checkedInAt: string
}

export interface TicketCheckInRow {
  order_item_id: string
  checked_in_at: string | null
}

export function findNewTicketCheckIns(
  rows: TicketCheckInRow[],
  knownTicketIds: ReadonlySet<string>,
): TicketCheckIn[] {
  const emitted = new Set<string>()

  return rows.flatMap((row) => {
    if (!row.checked_in_at || knownTicketIds.has(row.order_item_id) || emitted.has(row.order_item_id)) {
      return []
    }

    emitted.add(row.order_item_id)
    return [{ ticketId: row.order_item_id, checkedInAt: row.checked_in_at }]
  })
}
