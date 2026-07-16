export type ScannerInputMode = "qr" | "tapband"

export type ScannerClientStatus =
  | "validated"
  | "duplicate"
  | "not_found"
  | "wrong_event"
  | "revoked"
  | "refunded"
  | "transferred"
  | "not_paid"
  | "unauthorized"
  | "offline"
  | "tapband_unknown"
  | "tapband_no_entitlement"
  | "tapband_lost"
  | "tapband_replaced"
  | "tapband_reader_error"
  | "error"

export type ScannerClientResult = {
  valid: boolean
  status: ScannerClientStatus
  inputMode: ScannerInputMode
  message: string
  scanId?: string | null
  orderItemId?: string | null
  ticketTypeName?: string | null
  checkedInAt?: string | null
  idempotent?: boolean
}

export type TapBandCooldownState = {
  credentialPublicId: string
  attemptedAt: number
  attemptId: string
}

const LEGACY_OUTCOME_STATUS: Record<string, ScannerClientStatus> = {
  valid: "validated",
  already_used: "duplicate",
  unknown_ticket: "not_found",
  not_issued: "not_paid",
  invalid: "error",
}

const VALID_STATUSES = new Set<ScannerClientStatus>(["validated", "offline"])

export function scannerResultFromPayload(
  payload: Record<string, unknown>,
  responseOk: boolean,
  fallbackMode: ScannerInputMode,
): ScannerClientResult {
  const status = normalizeScannerStatus(payload.status, payload.outcome, responseOk)
  const legacyTicket = asRecord(payload.ticket)

  return {
    valid: typeof payload.valid === "boolean" ? payload.valid : VALID_STATUSES.has(status),
    status,
    inputMode: normalizeInputMode(payload.inputMode, fallbackMode),
    message: stringValue(payload.message) || stringValue(payload.error) || defaultScannerMessage(status, fallbackMode),
    scanId: nullableString(payload.scanId ?? payload.scan_id),
    orderItemId: nullableString(payload.orderItemId ?? payload.order_item_id ?? legacyTicket?.id),
    ticketTypeName: nullableString(payload.ticketTypeName ?? payload.ticket_type_name ?? legacyTicket?.type),
    checkedInAt: nullableString(payload.checkedInAt ?? payload.checked_in_at ?? legacyTicket?.checked_in_at),
    idempotent: typeof payload.idempotent === "boolean" ? payload.idempotent : false,
  }
}

export function normalizeCredentialPublicId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""

  try {
    const url = new URL(trimmed)
    const queryValue =
      url.searchParams.get("credentialPublicId") ||
      url.searchParams.get("credential_public_id") ||
      url.searchParams.get("credential") ||
      url.searchParams.get("tapband")
    if (queryValue?.trim()) return queryValue.trim()

    const lastPathSegment = url.pathname.split("/").filter(Boolean).at(-1)
    if (lastPathSegment?.trim()) return decodeURIComponent(lastPathSegment.trim())
  } catch {
    // Not a URL; treat it as the raw public credential id.
  }

  return trimmed.replace(/^tapband:/i, "").trim()
}

export function shouldSuppressTapBandRead(
  previous: TapBandCooldownState | null,
  credentialPublicId: string,
  now: number,
  cooldownMs: number,
) {
  if (!previous) return false
  if (previous.credentialPublicId.toLowerCase() !== credentialPublicId.toLowerCase()) return false
  return now - previous.attemptedAt < cooldownMs
}

export function scannerStatusTitle(status: ScannerClientStatus, inputMode: ScannerInputMode) {
  if (status === "validated") return inputMode === "tapband" ? "TapBand admitted" : "Valid ticket"
  if (status === "duplicate") return "Already checked in"
  if (status === "wrong_event") return "Wrong event"
  if (status === "not_found") return inputMode === "tapband" ? "Unknown TapBand" : "Unknown ticket"
  if (status === "tapband_unknown") return "Unknown TapBand"
  if (status === "tapband_no_entitlement") return "No ticket for this event"
  if (status === "tapband_lost") return "Lost TapBand"
  if (status === "tapband_replaced") return "Replaced TapBand"
  if (status === "tapband_reader_error") return "Reader error"
  if (status === "revoked") return inputMode === "tapband" ? "Inactive TapBand" : "Revoked ticket"
  if (status === "refunded") return "Refunded ticket"
  if (status === "transferred") return "Transferred ticket"
  if (status === "not_paid") return "Ticket not ready"
  if (status === "unauthorized") return "Scanner not assigned"
  if (status === "offline") return "Stored offline"
  return "Check failed"
}

export function scannerStatusTone(status: ScannerClientStatus) {
  if (status === "validated" || status === "offline") return "success"
  if (status === "duplicate" || status === "not_paid" || status === "tapband_reader_error") return "warning"
  return "danger"
}

function normalizeScannerStatus(status: unknown, outcome: unknown, responseOk: boolean): ScannerClientStatus {
  const rawStatus = stringValue(status)
  if (rawStatus && isScannerClientStatus(rawStatus)) return rawStatus

  const rawOutcome = stringValue(outcome)
  if (rawOutcome && isScannerClientStatus(rawOutcome)) return rawOutcome
  if (rawOutcome && LEGACY_OUTCOME_STATUS[rawOutcome]) return LEGACY_OUTCOME_STATUS[rawOutcome]

  return responseOk ? "validated" : "error"
}

function normalizeInputMode(value: unknown, fallbackMode: ScannerInputMode): ScannerInputMode {
  return value === "qr" || value === "tapband" ? value : fallbackMode
}

function defaultScannerMessage(status: ScannerClientStatus, mode: ScannerInputMode) {
  if (status === "validated") return mode === "tapband" ? "TapBand checked in" : "Ticket checked in"
  if (status === "duplicate") return "Already checked in for this event"
  if (status === "unauthorized") return "Scanner is not assigned to this event"
  if (status === "tapband_reader_error") return "TapBand could not be read"
  return "Scan complete"
}

function isScannerClientStatus(value: string): value is ScannerClientStatus {
  return [
    "validated",
    "duplicate",
    "not_found",
    "wrong_event",
    "revoked",
    "refunded",
    "transferred",
    "not_paid",
    "unauthorized",
    "offline",
    "tapband_unknown",
    "tapband_no_entitlement",
    "tapband_lost",
    "tapband_replaced",
    "tapband_reader_error",
    "error",
  ].includes(value)
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null
}
