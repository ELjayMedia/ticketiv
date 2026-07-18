import { describe, expect, it, vi } from "vitest";

import type {
  CameraScannerAdapter,
  PermissionStatus,
  ScanFrame,
  SecureStorageAdapter,
} from "@ticketiv/adapters";
import type { ScannerManifest, ScannerManifestItem } from "@ticketiv/shared";
import {
  createAccessAppShellState,
  createAccessScannerScreenController,
  type AccessSyncClientConfig,
} from "./index";
import { createAccessScannerSessionState } from "./scanner-session";

const BASE_URL = "https://ticketiv.app";
const SCANNED_AT = "2026-07-18T18:40:00.000Z";

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

function manifest(overrides: Partial<ScannerManifest> = {}): ScannerManifest {
  return {
    eventId: "event-1",
    fetchedAt: "2026-07-18T18:30:00.000Z",
    items: [item()],
    ...overrides,
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

function scannerState() {
  return createAccessScannerSessionState({
    eventId: "event-1",
    deviceId: "device-1",
    sessionId: "session-1",
    gate: "Gate A",
    manifest: manifest(),
  });
}

function storageAdapter(): SecureStorageAdapter & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
    async removeItem(key) {
      values.delete(key);
    },
  };
}

function cameraAdapter(input: {
  permission?: PermissionStatus;
  startScanning?: CameraScannerAdapter["startScanning"];
} = {}): CameraScannerAdapter {
  return {
    async getPermissionStatus() {
      return input.permission ?? "granted";
    },
    async requestPermission() {
      return input.permission ?? "granted";
    },
    startScanning: input.startScanning ?? vi.fn(async () => vi.fn()),
  };
}

describe("Access scanner screen controller", () => {
  it("reports missing scanner session and missing camera before native start", async () => {
    const noSession = createAccessScannerScreenController({
      config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
      state: createAccessAppShellState(),
      camera: cameraAdapter(),
    });

    await expect(noSession.startCamera()).resolves.toMatchObject({
      ok: false,
      error: { code: "missing_session" },
      summary: { status: "missing_session" },
    });

    const noCamera = createAccessScannerScreenController({
      config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
      state: createAccessAppShellState({ scanner: scannerState() }),
    });

    await expect(noCamera.startCamera()).resolves.toMatchObject({
      ok: false,
      error: { code: "missing_camera" },
      summary: { status: "missing_camera" },
    });
  });

  it("starts camera scanning, persists scan state, and exposes a privacy-safe scan summary", async () => {
    let onFrame: (frame: ScanFrame) => void = (_frame) => {
      throw new Error("Camera frame callback was not registered");
    };
    const stopNativeScanner = vi.fn();
    const storage = storageAdapter();
    const onStateChange = vi.fn();
    const onScanResult = vi.fn();
    const startScanning = vi.fn<CameraScannerAdapter["startScanning"]>(async (callback) => {
      onFrame = callback;
      return stopNativeScanner;
    });
    const controller = createAccessScannerScreenController({
      config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
      state: createAccessAppShellState({ scanner: scannerState() }),
      camera: cameraAdapter({ startScanning }),
      storage,
      onStateChange,
      onScanResult,
    });

    await expect(controller.startCamera()).resolves.toMatchObject({
      ok: true,
      summary: { status: "scanning" },
    });
    await expect(controller.startCamera()).resolves.toMatchObject({
      ok: true,
      summary: { status: "scanning" },
    });
    expect(startScanning).toHaveBeenCalledTimes(1);
    expect(onFrame).toBeTypeOf("function");

    onFrame(frame({ value: " TIV-1 " }));

    await vi.waitFor(() => {
      expect(controller.getSummary()).toMatchObject({
        status: "scanning",
        offlineQueueCount: 1,
        lastResult: {
          source: "manifest",
          valid: true,
          status: "validated",
          queuedOffline: true,
          onlineStatus: null,
        },
      });
    });
    expect(controller.getSummary().lastResult).not.toHaveProperty("orderItemId");
    expect(onStateChange).toHaveBeenCalledWith(expect.objectContaining({
      scanner: expect.objectContaining({ offlineQueue: expect.any(Array) }),
    }));
    expect(onScanResult).toHaveBeenCalledWith(
      expect.objectContaining({ source: "manifest" }),
      expect.objectContaining({ offlineQueueCount: 1 })
    );
    expect(storage.values.size).toBe(1);

    await controller.stopCamera();
    expect(stopNativeScanner).toHaveBeenCalledTimes(1);
    expect(controller.getSummary()).toMatchObject({ status: "stopped" });
  });

  it("runs manual sync, clears queued scans, and persists the refreshed scanner state", async () => {
    const queuedScanner = createAccessScannerSessionState({
      ...scannerState(),
      offlineQueue: [
        {
          code: "TIV-1",
          eventId: "event-1",
          deviceId: "device-1",
          sessionId: "session-1",
          gate: "Gate A",
          scannedAt: SCANNED_AT,
        },
      ],
    });
    const refreshedManifest = manifest({
      fetchedAt: "2026-07-18T18:45:00.000Z",
      items: [item({ already_checked_in: true, status: "checked_in" })],
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>()
      .mockResolvedValueOnce(jsonResponse(refreshedManifest))
      .mockResolvedValueOnce(jsonResponse({ synced: ["TIV-1"] }));
    const storage = storageAdapter();
    const onSyncResult = vi.fn();
    const controller = createAccessScannerScreenController({
      config: { baseUrl: BASE_URL, fetch },
      state: createAccessAppShellState({ scanner: queuedScanner }),
      storage,
      onSyncResult,
    });

    await expect(controller.syncNow()).resolves.toMatchObject({
      ok: true,
      summary: {
        status: "idle",
        manifestFetchedAt: "2026-07-18T18:45:00.000Z",
        offlineQueueCount: 0,
      },
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(onSyncResult).toHaveBeenCalledWith(
      expect.objectContaining({ queue: expect.objectContaining({ ok: true }) }),
      expect.objectContaining({ offlineQueueCount: 0 })
    );
    expect(storage.values.size).toBe(1);
  });

  it("surfaces sync errors without dropping the active scanner session", async () => {
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>().mockResolvedValueOnce(
      jsonResponse({ error: "Forbidden" }, { status: 403 })
    );
    const controller = createAccessScannerScreenController({
      config: { baseUrl: BASE_URL, fetch },
      state: createAccessAppShellState({ scanner: scannerState() }),
    });

    await expect(controller.syncNow()).resolves.toMatchObject({
      ok: false,
      error: { code: "sync_failed", status: 403 },
      summary: {
        status: "idle",
        eventId: "event-1",
        lastError: { code: "sync_failed", status: 403 },
      },
    });
    expect(controller.getState().scanner).toMatchObject({ eventId: "event-1" });
  });

  it("ends the screen session and persists the route back to pairing", async () => {
    const stopNativeScanner = vi.fn();
    const startScanning = vi.fn<CameraScannerAdapter["startScanning"]>(async () => {
      return stopNativeScanner;
    });
    const storage = storageAdapter();
    const controller = createAccessScannerScreenController({
      config: { baseUrl: BASE_URL, fetch: vi.fn<AccessSyncClientConfig["fetch"]>() },
      state: createAccessAppShellState({ scanner: scannerState() }),
      camera: cameraAdapter({ startScanning }),
      storage,
    });

    await controller.startCamera();
    const ended = await controller.endSession();

    expect(stopNativeScanner).toHaveBeenCalledTimes(1);
    expect(ended).toMatchObject({ activeRoute: "pair-device", scanner: null });
    expect(controller.getSummary()).toMatchObject({
      status: "missing_session",
      eventId: null,
      lastResult: null,
      lastError: null,
    });
    expect(storage.values.size).toBe(1);
  });
});
