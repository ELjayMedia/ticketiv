export type ScannerInputMode = "qr" | "tapband";

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
  | "tapband_multiple_entitlements"
  | "tapband_lost"
  | "tapband_replaced"
  | "tapband_unsupported_chip"
  | "tapband_unauthenticated_chip"
  | "tapband_reader_error"
  | "error";

export type ScannerValidationStatus = ScannerClientStatus;
export type ScannerOutcomeStatus = ScannerClientStatus;

export type ScannerClientResult = {
  valid: boolean;
  status: ScannerClientStatus;
  inputMode: ScannerInputMode;
  message: string;
  scanId?: string | null;
  orderItemId?: string | null;
  ticketTypeName?: string | null;
  checkedInAt?: string | null;
  idempotent?: boolean;
};

export type TapBandCooldownState = {
  credentialPublicId: string;
  attemptedAt: number;
  attemptId: string;
};

export type ScannerOutcomeTone = "success" | "danger" | "warning" | "muted";

export interface ScannerOutcomeCopy {
  title: string;
  detail: string;
  tone: ScannerOutcomeTone;
}

export type ScannerManifestItemStatus =
  | "issued"
  | "transferred"
  | "checked_in"
  | "revoked"
  | "refunded";

export interface ScannerManifestItem {
  ticket_code: string;
  order_item_id: string;
  ticket_type_id: string;
  status: ScannerManifestItemStatus;
  already_checked_in: boolean;
}

export interface ScannerManifest {
  eventId: string;
  fetchedAt: string;
  items: ScannerManifestItem[];
}

export interface ScannerManifestAccess {
  deviceId?: string | null;
  sessionId?: string | null;
}

export interface ScannerOfflineScanPayload {
  code: string;
  eventId: string;
  deviceId?: string | null;
  sessionId?: string | null;
  scannedAt: string;
  gate?: string | null;
}

export interface EvaluateScannerOfflineManifestInput {
  manifest: ScannerManifest | null;
  ticketCode: string;
  eventId: string;
  scannedAt: string;
  deviceId?: string | null;
  sessionId?: string | null;
  gate?: string | null;
  locallyUsed?: boolean;
}

export type ScannerOfflineManifestEvaluation =
  | {
      action: "miss";
      item: null;
      result: null;
      offlineScan: null;
    }
  | {
      action: "duplicate" | "blocked";
      item: ScannerManifestItem;
      result: ScannerClientResult;
      offlineScan: null;
    }
  | {
      action: "queue";
      item: ScannerManifestItem;
      result: ScannerClientResult;
      offlineScan: ScannerOfflineScanPayload;
    };

const LEGACY_OUTCOME_STATUS: Record<string, ScannerClientStatus> = {
  valid: "validated",
  already_used: "duplicate",
  unknown_ticket: "not_found",
  not_issued: "not_paid",
  invalid: "error",
};

const VALID_STATUSES = new Set<ScannerClientStatus>(["validated", "offline"]);

const SCANNER_STATUSES: ScannerClientStatus[] = [
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
  "tapband_multiple_entitlements",
  "tapband_lost",
  "tapband_replaced",
  "tapband_unsupported_chip",
  "tapband_unauthenticated_chip",
  "tapband_reader_error",
  "error",
];

const COPY: Record<ScannerOutcomeStatus, ScannerOutcomeCopy> = {
  validated: {
    title: "Valid · let them in",
    detail: "Ticket checked in and recorded.",
    tone: "success",
  },
  offline: {
    title: "Saved offline",
    detail: "Scan queued — sync once you reconnect.",
    tone: "warning",
  },
  duplicate: {
    title: "Already used",
    detail: "This ticket was already scanned at the gate.",
    tone: "warning",
  },
  wrong_event: {
    title: "Wrong event",
    detail: "Ticket belongs to a different event.",
    tone: "danger",
  },
  not_found: {
    title: "Unknown ticket",
    detail: "We don't recognise this code.",
    tone: "danger",
  },
  revoked: {
    title: "Revoked",
    detail: "Organizer revoked this ticket — do not admit.",
    tone: "danger",
  },
  refunded: {
    title: "Refunded",
    detail: "This ticket was refunded and is no longer valid.",
    tone: "danger",
  },
  transferred: {
    title: "Transferred ticket",
    detail: "This ticket has been transferred and is not valid for entry.",
    tone: "danger",
  },
  not_paid: {
    title: "Not paid",
    detail: "Payment hasn't completed for this order.",
    tone: "danger",
  },
  unauthorized: {
    title: "Not authorised",
    detail: "You're not assigned to scan this event.",
    tone: "danger",
  },
  tapband_unknown: {
    title: "Unknown TapBand",
    detail: "Use the attendee QR or manual fallback.",
    tone: "danger",
  },
  tapband_no_entitlement: {
    title: "No TapBand ticket",
    detail: "This band has no active ticket for this event.",
    tone: "danger",
  },
  tapband_multiple_entitlements: {
    title: "Multiple tickets",
    detail: "Use QR fallback until ticket selection is available.",
    tone: "warning",
  },
  tapband_lost: {
    title: "Lost TapBand",
    detail: "This band was reported lost — do not admit.",
    tone: "danger",
  },
  tapband_replaced: {
    title: "Replaced TapBand",
    detail: "Use the replacement band or QR fallback.",
    tone: "danger",
  },
  tapband_unsupported_chip: {
    title: "Unsupported TapBand",
    detail: "This chip is not supported by this scanner.",
    tone: "danger",
  },
  tapband_unauthenticated_chip: {
    title: "Unauthenticated TapBand",
    detail: "The band could not be authenticated.",
    tone: "danger",
  },
  tapband_reader_error: {
    title: "TapBand read failed",
    detail: "Try again or switch to QR/manual fallback.",
    tone: "warning",
  },
  error: {
    title: "Scan error",
    detail: "Something went wrong. Try again.",
    tone: "danger",
  },
};

export function scannerResultFromPayload(
  payload: Record<string, unknown>,
  responseOk: boolean,
  fallbackMode: ScannerInputMode
): ScannerClientResult {
  const status = normalizeScannerStatus(payload.status, payload.outcome, responseOk);
  const legacyTicket = asRecord(payload.ticket);

  return {
    valid: typeof payload.valid === "boolean" ? payload.valid : VALID_STATUSES.has(status),
    status,
    inputMode: normalizeInputMode(payload.inputMode, fallbackMode),
    message:
      stringValue(payload.message) ||
      stringValue(payload.error) ||
      defaultScannerMessage(status, fallbackMode),
    scanId: nullableString(payload.scanId ?? payload.scan_id),
    orderItemId: nullableString(payload.orderItemId ?? payload.order_item_id ?? legacyTicket?.id),
    ticketTypeName: nullableString(payload.ticketTypeName ?? payload.ticket_type_name ?? legacyTicket?.type),
    checkedInAt: nullableString(payload.checkedInAt ?? payload.checked_in_at ?? legacyTicket?.checked_in_at),
    idempotent: typeof payload.idempotent === "boolean" ? payload.idempotent : false,
  };
}

export function normalizeCredentialPublicId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const queryValue =
      url.searchParams.get("credentialPublicId") ||
      url.searchParams.get("credential_public_id") ||
      url.searchParams.get("credential") ||
      url.searchParams.get("tapband");
    if (queryValue?.trim()) return queryValue.trim();

    const lastPathSegment = url.pathname.split("/").filter(Boolean).at(-1);
    if (lastPathSegment?.trim()) return decodeURIComponent(lastPathSegment.trim());
  } catch {
    // Not a URL; treat it as the raw public credential id.
  }

  return trimmed.replace(/^tapband:/i, "").trim();
}

export function shouldSuppressTapBandRead(
  previous: TapBandCooldownState | null,
  credentialPublicId: string,
  now: number,
  cooldownMs: number
) {
  if (!previous) return false;
  if (previous.credentialPublicId.toLowerCase() !== credentialPublicId.toLowerCase()) return false;
  return now - previous.attemptedAt < cooldownMs;
}

export function scannerStatusTitle(status: ScannerClientStatus, inputMode: ScannerInputMode) {
  if (status === "validated") return inputMode === "tapband" ? "TapBand admitted" : "Valid ticket";
  if (status === "duplicate") return "Already checked in";
  if (status === "wrong_event") return "Wrong event";
  if (status === "not_found") return inputMode === "tapband" ? "Unknown TapBand" : "Unknown ticket";
  if (status === "tapband_unknown") return "Unknown TapBand";
  if (status === "tapband_no_entitlement") return "No ticket for this event";
  if (status === "tapband_multiple_entitlements") return "Multiple tickets";
  if (status === "tapband_lost") return "Lost TapBand";
  if (status === "tapband_replaced") return "Replaced TapBand";
  if (status === "tapband_unsupported_chip") return "Unsupported TapBand";
  if (status === "tapband_unauthenticated_chip") return "Unauthenticated TapBand";
  if (status === "tapband_reader_error") return "Reader error";
  if (status === "revoked") return inputMode === "tapband" ? "Inactive TapBand" : "Revoked ticket";
  if (status === "refunded") return "Refunded ticket";
  if (status === "transferred") return "Transferred ticket";
  if (status === "not_paid") return "Ticket not ready";
  if (status === "unauthorized") return "Scanner not assigned";
  if (status === "offline") return "Stored offline";
  return "Check failed";
}

export function scannerStatusTone(status: ScannerClientStatus) {
  if (status === "validated") return "success";
  if (
    status === "offline" ||
    status === "duplicate" ||
    status === "not_paid" ||
    status === "tapband_multiple_entitlements" ||
    status === "tapband_reader_error"
  ) return "warning";
  return "danger";
}

export function copyForScannerStatus(status: string | undefined): ScannerOutcomeCopy {
  if (!status) return COPY.error;
  return COPY[status as ScannerOutcomeStatus] ?? COPY.error;
}

export function statusForScanOutcome(outcome: string | null | undefined): ScannerOutcomeStatus {
  switch (outcome) {
    case "valid":
      return "validated";
    case "already_used":
      return "duplicate";
    case "wrong_event":
      return "wrong_event";
    case "revoked":
      return "revoked";
    case "invalid":
      return "not_found";
    default:
      return "error";
  }
}

export function findScannerManifestItem(
  manifest: ScannerManifest | null,
  ticketCode: string
): ScannerManifestItem | null {
  if (!manifest) return null;
  return manifest.items.find((item) => item.ticket_code === ticketCode) ?? null;
}

export function mergeScannerManifestDelta(
  existing: ScannerManifest,
  delta: ScannerManifest
): ScannerManifest {
  const map = new Map(existing.items.map((item) => [item.order_item_id, item]));
  for (const item of delta.items) {
    map.set(item.order_item_id, item);
  }

  return {
    eventId: existing.eventId,
    fetchedAt: delta.fetchedAt,
    items: Array.from(map.values()),
  };
}

export function checkedInTicketCodesFromManifest(manifest: ScannerManifest): string[] {
  return manifest.items
    .filter((item) => item.already_checked_in || item.status === "checked_in")
    .map((item) => item.ticket_code);
}

export function evaluateScannerOfflineManifest(
  input: EvaluateScannerOfflineManifestInput
): ScannerOfflineManifestEvaluation {
  const ticketCode = input.ticketCode.trim();
  const item = findScannerManifestItem(input.manifest, ticketCode);

  if (!item) {
    return { action: "miss", item: null, result: null, offlineScan: null };
  }

  if (item.already_checked_in || item.status === "checked_in" || input.locallyUsed) {
    return {
      action: "duplicate",
      item,
      result: {
        valid: false,
        status: "duplicate",
        inputMode: "qr",
        message: "Already used",
        orderItemId: item.order_item_id,
      },
      offlineScan: null,
    };
  }

  if (item.status === "revoked" || item.status === "refunded" || item.status === "transferred") {
    return {
      action: "blocked",
      item,
      result: {
        valid: false,
        status: item.status,
        inputMode: "qr",
        message: defaultScannerMessage(item.status, "qr"),
        orderItemId: item.order_item_id,
      },
      offlineScan: null,
    };
  }

  const offlineScan: ScannerOfflineScanPayload = {
    code: ticketCode,
    eventId: input.eventId,
    deviceId: input.deviceId ?? null,
    sessionId: input.sessionId ?? null,
    scannedAt: input.scannedAt,
    gate: input.gate ?? null,
  };

  return {
    action: "queue",
    item,
    result: {
      valid: true,
      status: "offline",
      inputMode: "qr",
      message: "Valid locally — queued to sync",
      orderItemId: item.order_item_id,
    },
    offlineScan,
  };
}

function normalizeScannerStatus(status: unknown, outcome: unknown, responseOk: boolean): ScannerClientStatus {
  const rawStatus = stringValue(status);
  if (rawStatus && isScannerClientStatus(rawStatus)) return rawStatus;

  const rawOutcome = stringValue(outcome);
  if (rawOutcome && isScannerClientStatus(rawOutcome)) return rawOutcome;
  if (rawOutcome && LEGACY_OUTCOME_STATUS[rawOutcome]) return LEGACY_OUTCOME_STATUS[rawOutcome];

  return responseOk ? "validated" : "error";
}

function normalizeInputMode(value: unknown, fallbackMode: ScannerInputMode): ScannerInputMode {
  return value === "qr" || value === "tapband" ? value : fallbackMode;
}

function defaultScannerMessage(status: ScannerClientStatus, mode: ScannerInputMode) {
  if (status === "validated") return mode === "tapband" ? "TapBand checked in" : "Ticket checked in";
  if (status === "duplicate") return "Already checked in for this event";
  if (status === "unauthorized") return "Scanner is not assigned to this event";
  if (status === "revoked") return mode === "tapband" ? "TapBand is inactive" : "Ticket has been revoked";
  if (status === "refunded") return "Ticket has been refunded";
  if (status === "transferred") return "Ticket has been transferred";
  if (status === "tapband_multiple_entitlements") {
    return "Multiple active tickets are linked to this TapBand. Use QR fallback until ticket selection is available";
  }
  if (status === "tapband_unsupported_chip") return "TapBand chip is not supported by this scanner";
  if (status === "tapband_unauthenticated_chip") return "TapBand could not be authenticated";
  if (status === "tapband_reader_error") return "TapBand could not be read";
  return "Scan complete";
}

function isScannerClientStatus(value: string): value is ScannerClientStatus {
  return SCANNER_STATUSES.includes(value as ScannerClientStatus);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
