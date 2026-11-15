/**
 * A signed /t/<token> link grants read-only access to ONE live ticket.
 * Do not use bearer tokens to authorize transfers, refunds, follows or orders.
 * Never expose event-holder updates after the ticket is transferred/revoked.
 */
export function canViewTicketHolderGuide(status: string): boolean {
  return status === "issued" || status === "checked_in";
}

export function guestGuidePath(token: string): string {
  return `/t/${encodeURIComponent(token)}/companion`;
}
