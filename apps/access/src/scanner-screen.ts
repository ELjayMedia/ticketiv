import type {
  CameraScannerAdapter,
  SecureStorageAdapter,
} from "@ticketiv/adapters";
import type { ScannerClientResult } from "@ticketiv/shared";
import { endAccessScannerSession, type AccessAppShellState } from "./app-shell";
import { persistAccessNativeAppShell } from "./native-app-lifecycle";
import type { SaveAccessAppStateOptions } from "./persistence";
import {
  startAccessCameraScanner,
  type AccessCameraScannerStatus,
} from "./camera-scanner";
import {
  syncAccessScannerSession,
  type AccessFullSyncResult,
  type AccessSyncClientConfig,
  type AccessSyncError,
} from "./sync";
import type { AccessQrScanResult, AccessQrScanSource } from "./scan-coordinator";
import type { AccessScannerSessionState } from "./scanner-session";

export type AccessScannerScreenStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "syncing"
  | "permission_denied"
  | "permission_unavailable"
  | "camera_error"
  | "missing_session"
  | "missing_camera"
  | "stopped";

export type AccessScannerScreenErrorCode =
  | "missing_session"
  | "missing_camera"
  | "camera_error"
  | "sync_failed"
  | "persist_failed";

export type AccessScannerScreenError = {
  code: AccessScannerScreenErrorCode;
  message: string;
  status?: number;
};

export type AccessScannerScreenScanSummary = {
  source: AccessQrScanSource;
  valid: boolean;
  status: ScannerClientResult["status"];
  message: string;
  queuedOffline: boolean;
  onlineStatus: number | null;
};

export type AccessScannerScreenSummary = {
  status: AccessScannerScreenStatus;
  eventId: string | null;
  deviceId: string | null;
  sessionId: string | null;
  gate: string | null;
  manifestFetchedAt: string | null;
  offlineQueueCount: number;
  localUsedCount: number;
  lastResult: AccessScannerScreenScanSummary | null;
  lastError: AccessScannerScreenError | null;
};

export type AccessScannerScreenCallbacks = {
  onStateChange?: (state: AccessAppShellState) => void;
  onSummaryChange?: (summary: AccessScannerScreenSummary) => void;
  onScanResult?: (result: AccessQrScanResult, summary: AccessScannerScreenSummary) => void;
  onSyncResult?: (result: AccessFullSyncResult, summary: AccessScannerScreenSummary) => void;
  onError?: (error: AccessScannerScreenError, summary: AccessScannerScreenSummary) => void;
};

export type AccessScannerScreenControllerOptions = AccessScannerScreenCallbacks & {
  config: AccessSyncClientConfig;
  state: AccessAppShellState;
  camera?: CameraScannerAdapter | null;
  storage?: SecureStorageAdapter | null;
  storageOptions?: SaveAccessAppStateOptions;
  queueOnNetworkError?: boolean;
  duplicateFrameCooldownMs?: number;
};

export type AccessScannerScreenStartResult =
  | {
      ok: true;
      summary: AccessScannerScreenSummary;
    }
  | {
      ok: false;
      summary: AccessScannerScreenSummary;
      error: AccessScannerScreenError;
    };

export type AccessScannerScreenSyncResult =
  | {
      ok: true;
      result: AccessFullSyncResult;
      summary: AccessScannerScreenSummary;
    }
  | {
      ok: false;
      result: AccessFullSyncResult | null;
      summary: AccessScannerScreenSummary;
      error: AccessScannerScreenError;
    };

export type AccessScannerScreenController = {
  getState(): AccessAppShellState;
  getSummary(): AccessScannerScreenSummary;
  startCamera(): Promise<AccessScannerScreenStartResult>;
  syncNow(): Promise<AccessScannerScreenSyncResult>;
  stopCamera(): Promise<AccessScannerScreenSummary>;
  endSession(): Promise<AccessAppShellState>;
};

type ActiveCameraScanner = Extract<
  Awaited<ReturnType<typeof startAccessCameraScanner>>,
  { ok: true }
>;

export function createAccessScannerScreenController(
  options: AccessScannerScreenControllerOptions
): AccessScannerScreenController {
  let state = options.state;
  let status: AccessScannerScreenStatus = state.scanner ? "idle" : "missing_session";
  let lastResult: AccessScannerScreenScanSummary | null = null;
  let lastError: AccessScannerScreenError | null = state.scanner
    ? null
    : {
        code: "missing_session",
        message: "No scanner session is active.",
      };
  let activeCamera: ActiveCameraScanner | null = null;

  async function startCamera(): Promise<AccessScannerScreenStartResult> {
    const scanner = state.scanner;
    if (!scanner) return fail("missing_session", "No scanner session is active.");
    if (!options.camera) return fail("missing_camera", "No camera scanner adapter is available.");
    if (activeCamera && status === "scanning") {
      return { ok: true, summary: getSummary() };
    }

    setStatus("starting");
    const started = await startAccessCameraScanner({
      camera: options.camera,
      config: options.config,
      state: scanner,
      gate: scanner.gate,
      queueOnNetworkError: options.queueOnNetworkError,
      duplicateFrameCooldownMs: options.duplicateFrameCooldownMs,
      onStateChange: (nextScanner) => {
        void updateScannerState(nextScanner);
      },
      onScanResult: (result) => {
        lastResult = scanSummary(result);
        lastError = null;
        options.onScanResult?.(result, emitSummary());
      },
      onError: (error) => {
        setError({
          code: "camera_error",
          message: error.message,
        });
      },
    });

    if (!started.ok) {
      const error = cameraStartError(started.status, started.error);
      setError(error, started.status);
      return { ok: false, summary: getSummary(), error };
    }

    activeCamera = started;
    setStatus("scanning");
    return { ok: true, summary: getSummary() };
  }

  async function syncNow(): Promise<AccessScannerScreenSyncResult> {
    const scanner = state.scanner;
    if (!scanner) {
      return failSync("missing_session", "No scanner session is active.", null);
    }

    const previousStatus = status === "scanning" ? "scanning" : "idle";
    setStatus("syncing");
    const result = await syncAccessScannerSession(options.config, scanner);
    await updateScannerState(result.state);
    options.onSyncResult?.(result, getSummary());

    const syncError = firstSyncError(result);
    if (syncError) {
      const error = {
        code: "sync_failed",
        message: syncError.message,
        status: syncError.status,
      } satisfies AccessScannerScreenError;
      setError(error, previousStatus);
      return { ok: false, result, summary: getSummary(), error };
    }

    lastError = null;
    setStatus(previousStatus);
    return { ok: true, result, summary: getSummary() };
  }

  async function stopCamera(): Promise<AccessScannerScreenSummary> {
    if (activeCamera) {
      await activeCamera.stop();
      activeCamera = null;
    }

    setStatus("stopped");
    return getSummary();
  }

  async function endSession(): Promise<AccessAppShellState> {
    await stopCamera();
    state = endAccessScannerSession(state);
    lastResult = null;
    lastError = null;
    status = "missing_session";
    await persistState(state);
    notifyState();
    emitSummary();
    return state;
  }

  async function updateScannerState(nextScanner: AccessScannerSessionState): Promise<void> {
    state = {
      ...state,
      activeRoute: "scanner",
      scanner: nextScanner,
    };
    await persistState(state);
    notifyState();
    emitSummary();
  }

  async function persistState(nextState: AccessAppShellState): Promise<void> {
    if (!options.storage) return;

    try {
      await persistAccessNativeAppShell(
        options.storage,
        nextState,
        options.storageOptions
      );
    } catch (error) {
      const normalized = {
        code: "persist_failed",
        message: error instanceof Error ? error.message : "Unable to persist scanner state.",
      } satisfies AccessScannerScreenError;
      setError(normalized);
    }
  }

  function notifyState() {
    options.onStateChange?.(state);
  }

  function fail(
    code: Extract<AccessScannerScreenErrorCode, "missing_session" | "missing_camera">,
    message: string
  ): AccessScannerScreenStartResult {
    const error = { code, message };
    setError(error, code);
    return { ok: false, summary: getSummary(), error };
  }

  function failSync(
    code: Extract<AccessScannerScreenErrorCode, "missing_session">,
    message: string,
    result: AccessFullSyncResult | null
  ): AccessScannerScreenSyncResult {
    const error = { code, message };
    setError(error, code);
    return { ok: false, result, summary: getSummary(), error };
  }

  function setStatus(nextStatus: AccessScannerScreenStatus) {
    status = nextStatus;
    emitSummary();
  }

  function setError(
    error: AccessScannerScreenError,
    nextStatus: AccessScannerScreenStatus = status
  ) {
    lastError = error;
    status = nextStatus;
    const summary = emitSummary();
    options.onError?.(error, summary);
  }

  function emitSummary(): AccessScannerScreenSummary {
    const summary = getSummary();
    options.onSummaryChange?.(summary);
    return summary;
  }

  function getSummary(): AccessScannerScreenSummary {
    const scanner = state.scanner;
    return {
      status,
      eventId: scanner?.eventId ?? null,
      deviceId: scanner?.deviceId ?? null,
      sessionId: scanner?.sessionId ?? null,
      gate: scanner?.gate ?? null,
      manifestFetchedAt: scanner?.manifest?.fetchedAt ?? null,
      offlineQueueCount: scanner?.offlineQueue.length ?? 0,
      localUsedCount: scanner?.localUsedTicketCodes.length ?? 0,
      lastResult,
      lastError,
    };
  }

  return {
    getState: () => state,
    getSummary,
    startCamera,
    syncNow,
    stopCamera,
    endSession,
  };
}

function scanSummary(result: AccessQrScanResult): AccessScannerScreenScanSummary {
  return {
    source: result.source,
    valid: result.result.valid,
    status: result.result.status,
    message: result.result.message,
    queuedOffline: Boolean(result.offlineScan),
    onlineStatus: result.onlineStatus,
  };
}

function firstSyncError(result: AccessFullSyncResult): AccessSyncError | null {
  if (!result.manifest.ok) return result.manifest.error;
  if (!result.queue.ok) return result.queue.error;
  return null;
}

function cameraStartError(
  status: Exclude<AccessCameraScannerStatus, "scanning">,
  error: Error | null
): AccessScannerScreenError {
  if (status === "permission_denied") {
    return {
      code: "camera_error",
      message: "Camera permission was denied.",
    };
  }

  if (status === "permission_unavailable") {
    return {
      code: "camera_error",
      message: "Camera scanning is unavailable on this device.",
    };
  }

  return {
    code: "camera_error",
    message: error?.message ?? "Unable to start camera scanner.",
  };
}
