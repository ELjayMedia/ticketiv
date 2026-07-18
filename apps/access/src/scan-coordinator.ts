import {
  scannerResultFromPayload,
  type ScannerClientResult,
  type ScannerOfflineScanPayload,
} from "@ticketiv/shared";
import {
  scanAccessManifestTicket,
  type AccessScannerScanOutcome,
  type AccessScannerSessionState,
} from "./scanner-session";
import type { AccessSyncClientConfig } from "./sync";

export type AccessQrScanSource =
  | "manifest"
  | "local_duplicate"
  | "online"
  | "offline_fallback"
  | "invalid_input";

export type AccessQrScanErrorCode =
  | "network_error"
  | "validate_invalid";

export type AccessQrScanError = {
  code: AccessQrScanErrorCode;
  message: string;
  status?: number;
};

export type AccessQrScanInput = {
  ticketCode: string;
  scannedAt?: string;
  gate?: string | null;
  queueOnNetworkError?: boolean;
};

export type AccessQrScanResult = {
  source: AccessQrScanSource;
  state: AccessScannerSessionState;
  result: ScannerClientResult;
  offlineScan: ScannerOfflineScanPayload | null;
  localOutcome: AccessScannerScanOutcome | null;
  onlineStatus: number | null;
  error: AccessQrScanError | null;
};

export async function submitAccessQrScan(
  config: AccessSyncClientConfig,
  state: AccessScannerSessionState,
  input: AccessQrScanInput
): Promise<AccessQrScanResult> {
  const ticketCode = input.ticketCode.trim();
  const scannedAt = input.scannedAt ?? new Date().toISOString();
  const localOutcome = scanAccessManifestTicket(state, {
    ticketCode,
    scannedAt,
    gate: input.gate,
  });

  if (localOutcome.result) {
    return {
      source: localOutcome.action === "invalid_input" ? "invalid_input" : "manifest",
      state: localOutcome.state,
      result: localOutcome.result,
      offlineScan: localOutcome.offlineScan,
      localOutcome,
      onlineStatus: null,
      error: null,
    };
  }

  if (isTicketCodeLocallyUsed(state, ticketCode)) {
    return {
      source: "local_duplicate",
      state,
      result: duplicateScannerResult(),
      offlineScan: null,
      localOutcome,
      onlineStatus: null,
      error: null,
    };
  }

  try {
    const response = await config.fetch(buildAccessValidateUrl(config.baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: ticketCode,
        eventId: state.eventId,
        deviceId: state.deviceId,
        sessionId: state.sessionId,
        gate: normalizeNullable(input.gate) ?? state.gate,
        scannedAt,
      }),
    });

    const body = await readJson(response);
    if (!isRecord(body)) {
      return {
        source: "online",
        state,
        result: {
          valid: false,
          status: "error",
          inputMode: "qr",
          message: "Scanner validation response was invalid",
        },
        offlineScan: null,
        localOutcome,
        onlineStatus: response.status,
        error: {
          code: "validate_invalid",
          message: "Scanner validation response was invalid",
          status: response.status,
        },
      };
    }

    const result = scannerResultFromPayload(body, response.ok, "qr");
    return {
      source: "online",
      state: result.valid ? markTicketCodeLocallyUsed(state, ticketCode) : state,
      result,
      offlineScan: null,
      localOutcome,
      onlineStatus: response.status,
      error: null,
    };
  } catch (error) {
    if (input.queueOnNetworkError === false) {
      return {
        source: "online",
        state,
        result: networkErrorScannerResult(error),
        offlineScan: null,
        localOutcome,
        onlineStatus: null,
        error: {
          code: "network_error",
          message: error instanceof Error ? error.message : "Network unavailable",
        },
      };
    }

    const fallback = queueFallbackOfflineScan(state, {
      ticketCode,
      scannedAt,
      gate: input.gate,
    });

    return {
      source: "offline_fallback",
      state: fallback.state,
      result: fallback.result,
      offlineScan: fallback.offlineScan,
      localOutcome,
      onlineStatus: null,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Network unavailable",
      },
    };
  }
}

export function buildAccessValidateUrl(baseUrl: string): string {
  return new URL("/api/scanner/validate", normalizedBaseUrl(baseUrl)).toString();
}

function queueFallbackOfflineScan(
  state: AccessScannerSessionState,
  input: Required<Pick<AccessQrScanInput, "ticketCode" | "scannedAt">> &
    Pick<AccessQrScanInput, "gate">
) {
  const gate = normalizeNullable(input.gate) ?? state.gate;
  const offlineScan: ScannerOfflineScanPayload = {
    code: input.ticketCode,
    eventId: state.eventId,
    deviceId: state.deviceId,
    sessionId: state.sessionId ?? `offline-${state.deviceId}`,
    scannedAt: input.scannedAt,
    gate,
  };

  return {
    state: {
      ...markTicketCodeLocallyUsed(state, input.ticketCode),
      offlineQueue: [...state.offlineQueue, offlineScan],
    },
    result: {
      valid: true,
      status: "offline",
      inputMode: "qr",
      message: "Network unavailable. Scan stored offline.",
    } satisfies ScannerClientResult,
    offlineScan,
  };
}

function duplicateScannerResult(): ScannerClientResult {
  return {
    valid: false,
    status: "duplicate",
    inputMode: "qr",
    message: "Already used",
  };
}

function networkErrorScannerResult(error: unknown): ScannerClientResult {
  return {
    valid: false,
    status: "error",
    inputMode: "qr",
    message: error instanceof Error ? error.message : "Network unavailable",
  };
}

function markTicketCodeLocallyUsed(
  state: AccessScannerSessionState,
  ticketCode: string
): AccessScannerSessionState {
  if (!ticketCode) return state;
  if (isTicketCodeLocallyUsed(state, ticketCode)) return state;
  return {
    ...state,
    localUsedTicketCodes: [...state.localUsedTicketCodes, ticketCode],
  };
}

function isTicketCodeLocallyUsed(
  state: AccessScannerSessionState,
  ticketCode: string
): boolean {
  return state.localUsedTicketCodes.some((code) => code === ticketCode);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizedBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}
