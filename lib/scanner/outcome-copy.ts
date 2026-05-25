/**
 * Map a scanner result status to the headline + supporting copy + tone the
 * scanner UI should render. Centralized so the live result panel and the
 * recent-scans feed stay consistent.
 *
 * Statuses cover everything `validateQrCode` returns plus the optimistic
 * client-side branches (offline-queued, manifest-validated).
 */

export type ScannerOutcomeStatus =
  | "validated"
  | "duplicate"
  | "not_found"
  | "wrong_event"
  | "revoked"
  | "refunded"
  | "not_paid"
  | "unauthorized"
  | "offline"
  | "error"

export type ScannerOutcomeTone = "success" | "danger" | "warning" | "muted"

export interface ScannerOutcomeCopy {
  title: string
  detail: string
  tone: ScannerOutcomeTone
}

const COPY: Record<ScannerOutcomeStatus, ScannerOutcomeCopy> = {
  validated: { title: "Valid · let them in", detail: "Ticket checked in and recorded.", tone: "success" },
  offline: { title: "Saved offline", detail: "Scan queued — sync once you reconnect.", tone: "warning" },
  duplicate: { title: "Already used", detail: "This ticket was already scanned at the gate.", tone: "warning" },
  wrong_event: { title: "Wrong event", detail: "Ticket belongs to a different event.", tone: "danger" },
  not_found: { title: "Unknown ticket", detail: "We don't recognise this code.", tone: "danger" },
  revoked: { title: "Revoked", detail: "Organizer revoked this ticket — do not admit.", tone: "danger" },
  refunded: { title: "Refunded", detail: "This ticket was refunded and is no longer valid.", tone: "danger" },
  not_paid: { title: "Not paid", detail: "Payment hasn't completed for this order.", tone: "danger" },
  unauthorized: { title: "Not authorised", detail: "You're not assigned to scan this event.", tone: "danger" },
  error: { title: "Scan error", detail: "Something went wrong. Try again.", tone: "danger" },
}

export function copyForScannerStatus(status: string | undefined): ScannerOutcomeCopy {
  if (!status) return COPY.error
  return COPY[status as ScannerOutcomeStatus] ?? COPY.error
}

/**
 * Map the raw DB `scans.outcome` text to a display status. The DB column
 * uses a smaller vocabulary than the API response (no `refunded`,
 * `not_paid`, `unauthorized` — those live only at the API layer).
 */
export function statusForScanOutcome(outcome: string | null | undefined): ScannerOutcomeStatus {
  switch (outcome) {
    case "valid":
      return "validated"
    case "already_used":
      return "duplicate"
    case "wrong_event":
      return "wrong_event"
    case "revoked":
      return "revoked"
    case "invalid":
      return "not_found"
    default:
      return "error"
  }
}
