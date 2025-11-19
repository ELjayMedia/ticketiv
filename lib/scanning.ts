import { findTicketByCode, markTicketScanned } from "./orders"

export interface ScanResult {
  valid: boolean
  message: string
  ticketCode?: string
  eventTitle?: string
  scannedAt?: string
}

export async function validateTicket(code: string): Promise<ScanResult> {
  if (!code.trim()) {
    return { valid: false, message: "No QR code provided" }
  }

  const match = await findTicketByCode(code)
  if (!match) {
    return { valid: false, message: "Ticket not found" }
  }

  if (match.ticket.scannedAt) {
    return {
      valid: false,
      message: "Ticket was already scanned",
      ticketCode: match.ticket.code,
      eventTitle: match.order.eventTitle,
      scannedAt: match.ticket.scannedAt,
    }
  }

  const updated = await markTicketScanned(code)
  return {
    valid: true,
    message: "Ticket validated",
    ticketCode: updated?.ticket.code,
    eventTitle: updated?.order.eventTitle,
    scannedAt: updated?.ticket.scannedAt,
  }
}
