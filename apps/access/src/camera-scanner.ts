import type {
  CameraScannerAdapter,
  PermissionStatus,
  ScanFrame,
} from "@ticketiv/adapters";
import {
  submitAccessQrScan,
  type AccessQrScanInput,
  type AccessQrScanResult,
} from "./scan-coordinator";
import type { AccessScannerSessionState } from "./scanner-session";
import type { AccessSyncClientConfig } from "./sync";

export type AccessCameraFrameIgnoredReason =
  | "stopped"
  | "in_flight"
  | "unsupported_format"
  | "empty"
  | "duplicate_frame";

export type AccessCameraFrameResult =
  | {
      accepted: true;
      scan: AccessQrScanResult;
      state: AccessScannerSessionState;
    }
  | {
      accepted: false;
      reason: AccessCameraFrameIgnoredReason;
      state: AccessScannerSessionState;
    };

export type AccessCameraScannerStatus =
  | "scanning"
  | "permission_denied"
  | "permission_unavailable"
  | "camera_error";

export type AccessCameraScannerCallbacks = {
  onScanResult?: (result: AccessQrScanResult) => void;
  onFrameIgnored?: (result: Extract<AccessCameraFrameResult, { accepted: false }>) => void;
  onStateChange?: (state: AccessScannerSessionState) => void;
  onError?: (error: Error) => void;
};

export type AccessCameraScanControllerOptions = AccessCameraScannerCallbacks & {
  config: AccessSyncClientConfig;
  state: AccessScannerSessionState;
  gate?: string | null;
  queueOnNetworkError?: boolean;
  duplicateFrameCooldownMs?: number;
  acceptedFormats?: ReadonlyArray<ScanFrame["format"]>;
  now?: () => number;
};

export type AccessCameraScanController = {
  handleFrame(frame: ScanFrame): Promise<AccessCameraFrameResult>;
  getState(): AccessScannerSessionState;
  stop(): void;
  isInFlight(): boolean;
};

export type StartAccessCameraScannerInput =
  AccessCameraScanControllerOptions & {
    camera: CameraScannerAdapter;
  };

export type StartAccessCameraScannerResult =
  | {
      ok: true;
      status: "scanning";
      permission: "granted";
      controller: AccessCameraScanController;
      stop(): Promise<void>;
      getState(): AccessScannerSessionState;
    }
  | {
      ok: false;
      status: Exclude<AccessCameraScannerStatus, "scanning">;
      permission: PermissionStatus | null;
      state: AccessScannerSessionState;
      error: Error | null;
    };

const DEFAULT_DUPLICATE_FRAME_COOLDOWN_MS = 1_500;

export function createAccessCameraScanController(
  options: AccessCameraScanControllerOptions
): AccessCameraScanController {
  let state = options.state;
  let stopped = false;
  let inFlight = false;
  let lastSubmittedFrame: { code: string; submittedAt: number } | null = null;

  const acceptedFormats = new Set<ScanFrame["format"]>(options.acceptedFormats ?? ["qr"]);
  const duplicateFrameCooldownMs =
    options.duplicateFrameCooldownMs ?? DEFAULT_DUPLICATE_FRAME_COOLDOWN_MS;
  const now = options.now ?? Date.now;

  async function handleFrame(frame: ScanFrame): Promise<AccessCameraFrameResult> {
    if (stopped) return ignored("stopped");
    if (inFlight) return ignored("in_flight");
    if (!acceptedFormats.has(frame.format)) return ignored("unsupported_format");

    const ticketCode = frame.value.trim();
    if (!ticketCode) return ignored("empty");

    const submittedAt = now();
    if (
      lastSubmittedFrame?.code === ticketCode &&
      submittedAt - lastSubmittedFrame.submittedAt < duplicateFrameCooldownMs
    ) {
      return ignored("duplicate_frame");
    }

    inFlight = true;
    lastSubmittedFrame = { code: ticketCode, submittedAt };

    try {
      const scan = await submitAccessQrScan(options.config, state, {
        ticketCode,
        scannedAt: frame.scannedAt,
        gate: options.gate,
        queueOnNetworkError: options.queueOnNetworkError,
      } satisfies AccessQrScanInput);

      state = scan.state;
      options.onStateChange?.(state);
      options.onScanResult?.(scan);

      return {
        accepted: true,
        scan,
        state,
      };
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error("Camera scan failed");
      options.onError?.(normalized);
      throw normalized;
    } finally {
      inFlight = false;
    }
  }

  function ignored(reason: AccessCameraFrameIgnoredReason): AccessCameraFrameResult {
    const result = {
      accepted: false,
      reason,
      state,
    } as const;
    options.onFrameIgnored?.(result);
    return result;
  }

  return {
    handleFrame,
    getState: () => state,
    stop: () => {
      stopped = true;
    },
    isInFlight: () => inFlight,
  };
}

export async function startAccessCameraScanner(
  input: StartAccessCameraScannerInput
): Promise<StartAccessCameraScannerResult> {
  let permission = await input.camera.getPermissionStatus();
  if (permission === "prompt") {
    permission = await input.camera.requestPermission();
  }

  if (permission !== "granted") {
    return {
      ok: false,
      status: permission === "unavailable" ? "permission_unavailable" : "permission_denied",
      permission,
      state: input.state,
      error: null,
    };
  }

  const controller = createAccessCameraScanController(input);

  try {
    const stopNativeScanner = await input.camera.startScanning((frame) => {
      void controller.handleFrame(frame);
    });

    return {
      ok: true,
      status: "scanning",
      permission,
      controller,
      stop: async () => {
        controller.stop();
        await stopNativeScanner();
      },
      getState: controller.getState,
    };
  } catch (error) {
    controller.stop();
    const normalized = error instanceof Error ? error : new Error("Unable to start camera scanner");
    input.onError?.(normalized);

    return {
      ok: false,
      status: "camera_error",
      permission,
      state: input.state,
      error: normalized,
    };
  }
}
