import { describe, expect, it, vi } from "vitest";

import type { CameraScannerAdapter, PermissionStatus, ScanFrame } from "@ticketiv/adapters";
import type { ScannerManifest, ScannerManifestItem } from "@ticketiv/shared";
import {
  createAccessCameraScanController,
  startAccessCameraScanner,
  type AccessSyncClientConfig,
} from "./index";
import { createAccessScannerSessionState } from "./scanner-session";

const BASE_URL = "https://ticketiv.app";
const SCANNED_AT = "2026-07-18T18:20:00.000Z";

function item(overrides: Partial<ScannerManifestItem> = {}): ScannerManifestItem {
  return {
    ticket_code: "TIV-1",
    order_item_id: "item-1",
    ticket_type_id: "type-1",
    status: "issued",
    already_checked_in: false,
    ...overrides,
  };
}

function manifest(items: ScannerManifestItem[]): ScannerManifest {
  return {
    eventId: "event-1",
    fetchedAt: "2026-07-18T18:15:00.000Z",
    items,
  };
}

function frame(overrides: Partial<ScanFrame> = {}): ScanFrame {
  return {
    value: "TIV-1",
    format: "qr",
    scannedAt: SCANNED_AT,
    ...overrides,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function cameraAdapter(input: {
  permission?: PermissionStatus;
  requestedPermission?: PermissionStatus;
  startScanning?: CameraScannerAdapter["startScanning"];
} = {}): CameraScannerAdapter {
  return {
    async getPermissionStatus() {
      return input.permission ?? "granted";
    },
    async requestPermission() {
      return input.requestedPermission ?? "granted";
    },
    startScanning: input.startScanning ?? vi.fn(async () => vi.fn()),
  };
}

describe("Access camera scanner", () => {
  it("submits QR frames through the local-first scan coordinator", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "Main",
      manifest: manifest([item()]),
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>();
    const onScanResult = vi.fn();
    const onStateChange = vi.fn();
    const controller = createAccessCameraScanController({
      config: { baseUrl: BASE_URL, fetch },
      state,
      onScanResult,
      onStateChange,
    });

    const result = await controller.handleFrame(frame({ value: " TIV-1 " }));

    expect(result).toMatchObject({
      accepted: true,
      scan: { source: "manifest", result: { valid: true, status: "offline" } },
    });
    expect(controller.getState().offlineQueue).toHaveLength(1);
    expect(onScanResult).toHaveBeenCalledWith(expect.objectContaining({ source: "manifest" }));
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({ offlineQueue: expect.any(Array) }));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ignores unsupported, empty, duplicate, and stopped frames", async () => {
    let now = 1_000;
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      manifest: manifest([item()]),
    });
    const onFrameIgnored = vi.fn();
    const controller = createAccessCameraScanController({
      config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
      state,
      now: () => now,
      onFrameIgnored,
    });

    await expect(controller.handleFrame(frame({ format: "barcode" }))).resolves.toMatchObject({
      accepted: false,
      reason: "unsupported_format",
    });
    await expect(controller.handleFrame(frame({ value: " " }))).resolves.toMatchObject({
      accepted: false,
      reason: "empty",
    });
    await expect(controller.handleFrame(frame({ value: "TIV-1" }))).resolves.toMatchObject({
      accepted: true,
    });
    now = 1_250;
    await expect(controller.handleFrame(frame({ value: "TIV-1" }))).resolves.toMatchObject({
      accepted: false,
      reason: "duplicate_frame",
    });
    controller.stop();
    now = 3_000;
    await expect(controller.handleFrame(frame({ value: "TIV-2" }))).resolves.toMatchObject({
      accepted: false,
      reason: "stopped",
    });

    expect(onFrameIgnored).toHaveBeenCalledWith(expect.objectContaining({ reason: "unsupported_format" }));
    expect(onFrameIgnored).toHaveBeenCalledWith(expect.objectContaining({ reason: "empty" }));
    expect(onFrameIgnored).toHaveBeenCalledWith(expect.objectContaining({ reason: "duplicate_frame" }));
    expect(onFrameIgnored).toHaveBeenCalledWith(expect.objectContaining({ reason: "stopped" }));
  });

  it("suppresses new frames while live validation is in flight", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
    });
    const pendingResponse = deferred<Response>();
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>().mockReturnValue(pendingResponse.promise);
    const controller = createAccessCameraScanController({
      config: { baseUrl: BASE_URL, fetch },
      state,
    });

    const first = controller.handleFrame(frame({ value: "TIV-99" }));
    expect(controller.isInFlight()).toBe(true);

    await expect(controller.handleFrame(frame({ value: "TIV-100" }))).resolves.toMatchObject({
      accepted: false,
      reason: "in_flight",
    });

    pendingResponse.resolve(
      jsonResponse({
        valid: true,
        status: "validated",
        inputMode: "qr",
        message: "Ticket checked in",
        orderItemId: "item-99",
      })
    );

    await expect(first).resolves.toMatchObject({
      accepted: true,
      scan: { source: "online", result: { status: "validated" } },
    });
    expect(controller.isInFlight()).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("starts the native camera after prompt permission and exposes stop", async () => {
    const stopNativeScanner = vi.fn();
    const startScanning = vi.fn<CameraScannerAdapter["startScanning"]>(async (callback) => {
      return stopNativeScanner;
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>();
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      manifest: manifest([item()]),
    });

    const started = await startAccessCameraScanner({
      camera: cameraAdapter({
        permission: "prompt",
        requestedPermission: "granted",
        startScanning,
      }),
      config: { baseUrl: BASE_URL, fetch },
      state,
    });

    expect(started).toMatchObject({ ok: true, status: "scanning", permission: "granted" });
    expect(startScanning).toHaveBeenCalledTimes(1);

    const onFrame = startScanning.mock.calls[0]?.[0];
    expect(onFrame).toBeTypeOf("function");
    onFrame(frame({ value: "TIV-1" }));
    await vi.waitFor(() => {
      if (!started.ok) throw new Error("Scanner did not start");
      expect(started.getState().offlineQueue).toHaveLength(1);
    });

    if (!started.ok) throw new Error("Scanner did not start");
    await started.stop();
    expect(stopNativeScanner).toHaveBeenCalledTimes(1);
  });

  it("does not start scanning when permission is denied or unavailable", async () => {
    const deniedStart = vi.fn<CameraScannerAdapter["startScanning"]>();
    const unavailableStart = vi.fn<CameraScannerAdapter["startScanning"]>();
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
    });

    await expect(
      startAccessCameraScanner({
        camera: cameraAdapter({ permission: "denied", startScanning: deniedStart }),
        config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
        state,
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "permission_denied",
      permission: "denied",
    });
    expect(deniedStart).not.toHaveBeenCalled();

    await expect(
      startAccessCameraScanner({
        camera: cameraAdapter({ permission: "unavailable", startScanning: unavailableStart }),
        config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
        state,
      })
    ).resolves.toMatchObject({
      ok: false,
      status: "permission_unavailable",
      permission: "unavailable",
    });
    expect(unavailableStart).not.toHaveBeenCalled();
  });

  it("returns camera startup errors without leaving the controller running", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
    });
    const onError = vi.fn();

    const result = await startAccessCameraScanner({
      camera: cameraAdapter({
        startScanning: vi.fn(async () => {
          throw new Error("camera busy");
        }),
      }),
      config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
      state,
      onError,
    });

    expect(result).toMatchObject({
      ok: false,
      status: "camera_error",
      permission: "granted",
      error: expect.objectContaining({ message: "camera busy" }),
    });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "camera busy" }));
  });
});
