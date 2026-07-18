import {
  checkedInTicketCodesFromManifest,
  evaluateScannerOfflineManifest,
  type ScannerClientResult,
  type ScannerManifest,
  type ScannerOfflineManifestEvaluation,
  type ScannerOfflineScanPayload,
} from "@ticketiv/shared";

export type AccessScannerAction =
  | ScannerOfflineManifestEvaluation["action"]
  | "invalid_input";

export type AccessScannerSessionState = {
  eventId: string;
  deviceId: string;
  sessionId: string | null;
  gate: string | null;
  manifest: ScannerManifest | null;
  localUsedTicketCodes: string[];
  offlineQueue: ScannerOfflineScanPayload[];
};

export type CreateAccessScannerSessionInput = {
  eventId: string;
  deviceId: string;
  sessionId?: string | null;
  gate?: string | null;
  manifest?: ScannerManifest | null;
  localUsedTicketCodes?: string[];
  offlineQueue?: ScannerOfflineScanPayload[];
};

export type AccessScannerScanInput = {
  ticketCode: string;
  scannedAt: string;
  gate?: string | null;
};

export type AccessScannerScanOutcome = {
  action: AccessScannerAction;
  state: AccessScannerSessionState;
  result: ScannerClientResult | null;
  offlineScan: ScannerOfflineScanPayload | null;
  shouldValidateOnline: boolean;
};

export function createAccessScannerSessionState(
  input: CreateAccessScannerSessionInput
): AccessScannerSessionState {
  return {
    eventId: input.eventId,
    deviceId: input.deviceId,
    sessionId: input.sessionId ?? null,
    gate: normalizeNullable(input.gate),
    manifest: input.manifest ?? null,
    localUsedTicketCodes: uniqueStrings([
      ...(input.localUsedTicketCodes ?? []),
      ...(input.manifest ? checkedInTicketCodesFromManifest(input.manifest) : []),
    ]),
    offlineQueue: input.offlineQueue ?? [],
  };
}

export function applyAccessScannerManifest(
  state: AccessScannerSessionState,
  manifest: ScannerManifest
): AccessScannerSessionState {
  return {
    ...state,
    manifest,
    localUsedTicketCodes: uniqueStrings([
      ...state.localUsedTicketCodes,
      ...checkedInTicketCodesFromManifest(manifest),
    ]),
  };
}

export function scanAccessManifestTicket(
  state: AccessScannerSessionState,
  input: AccessScannerScanInput
): AccessScannerScanOutcome {
  const ticketCode = input.ticketCode.trim();
  if (!ticketCode) {
    return {
      action: "invalid_input",
      state,
      result: {
        valid: false,
        status: "error",
        inputMode: "qr",
        message: "No QR code provided",
      },
      offlineScan: null,
      shouldValidateOnline: false,
    };
  }

  const gate = normalizeNullable(input.gate) ?? state.gate;
  const evaluation = evaluateScannerOfflineManifest({
    manifest: state.manifest,
    ticketCode,
    eventId: state.eventId,
    deviceId: state.deviceId,
    sessionId: state.sessionId ?? `offline-${state.deviceId}`,
    scannedAt: input.scannedAt,
    gate,
    locallyUsed: state.localUsedTicketCodes.includes(ticketCode),
  });

  if (evaluation.action === "miss") {
    return {
      action: "miss",
      state,
      result: null,
      offlineScan: null,
      shouldValidateOnline: true,
    };
  }

  if (evaluation.action === "queue") {
    const nextState = {
      ...state,
      offlineQueue: [...state.offlineQueue, evaluation.offlineScan],
      localUsedTicketCodes: uniqueStrings([...state.localUsedTicketCodes, ticketCode]),
    };

    return {
      action: "queue",
      state: nextState,
      result: evaluation.result,
      offlineScan: evaluation.offlineScan,
      shouldValidateOnline: false,
    };
  }

  return {
    action: evaluation.action,
    state,
    result: evaluation.result,
    offlineScan: null,
    shouldValidateOnline: false,
  };
}

export function markAccessOfflineQueueSynced(
  state: AccessScannerSessionState,
  syncedCodes: ReadonlyArray<string>
): AccessScannerSessionState {
  const synced = new Set(syncedCodes.map((code) => code.trim()).filter(Boolean));
  if (synced.size === 0) return state;

  return {
    ...state,
    offlineQueue: state.offlineQueue.filter((scan) => !synced.has(scan.code)),
  };
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
