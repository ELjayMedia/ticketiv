import { describe, expect, it } from "vitest";

import type { SecureStorageAdapter } from "@ticketiv/adapters";
import type { ScannerManifest, ScannerManifestItem } from "@ticketiv/shared";
import { createAccessAppShellState } from "./app-shell";
import { createAccessPairingState } from "./device-pairing";
import {
  createAccessScannerSessionState,
  scanAccessManifestTicket,
} from "./scanner-session";
import {
  ACCESS_APP_STATE_STORAGE_KEY,
  clearAccessAppState,
  loadAccessAppState,
  parseAccessAppStateSnapshot,
  saveAccessAppState,
  serializeAccessAppState,
} from "./persistence";

const SCANNED_AT = "2026-07-18T13:10:00.000Z";

class MemorySecureStorage implements SecureStorageAdapter {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

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
    fetchedAt: "2026-07-18T13:00:00.000Z",
    items,
  };
}

describe("Access app state persistence", () => {
  it("serializes pairing state without persisting one-time setup codes", () => {
    const serialized = serializeAccessAppState(
      createAccessAppShellState({
        pairing: createAccessPairingState({
          code: "abc123",
          deviceId: " device-1 ",
          deviceLabel: " Gate A ",
        }),
      }),
      "2026-07-18T13:05:00.000Z"
    );
    const parsed = parseAccessAppStateSnapshot(serialized);

    expect(serialized).not.toContain("abc123");
    expect(parsed).toMatchObject({
      ok: true,
      snapshot: {
        schemaVersion: 1,
        savedAt: "2026-07-18T13:05:00.000Z",
        activeRoute: "pair-device",
        pairing: {
          deviceId: "device-1",
          deviceLabel: "Gate A",
        },
        scanner: null,
      },
    });
  });

  it("saves and restores scanner state through secure storage", async () => {
    const storage = new MemorySecureStorage();
    const initialScanner = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "Main gate",
      manifest: manifest([item()]),
    });
    const queued = scanAccessManifestTicket(initialScanner, {
      ticketCode: "TIV-1",
      scannedAt: SCANNED_AT,
    }).state;

    await saveAccessAppState(
      storage,
      createAccessAppShellState({
        activeRoute: "scanner",
        scanner: queued,
      }),
      { savedAt: "2026-07-18T13:11:00.000Z" }
    );

    const restored = await loadAccessAppState(storage);

    expect(restored).toMatchObject({
      activeRoute: "scanner",
      scanner: {
        eventId: "event-1",
        deviceId: "device-1",
        sessionId: "session-1",
        gate: "Main gate",
        offlineQueue: [{ code: "TIV-1" }],
        localUsedTicketCodes: ["TIV-1"],
      },
    });

    const duplicate = scanAccessManifestTicket(restored!.scanner!, {
      ticketCode: "TIV-1",
      scannedAt: "2026-07-18T13:12:00.000Z",
    });
    expect(duplicate).toMatchObject({
      action: "duplicate",
      result: { status: "duplicate", valid: false },
    });
  });

  it("rebuilds local duplicate protection from an offline queue if needed", () => {
    const parsed = parseAccessAppStateSnapshot(
      JSON.stringify({
        schemaVersion: 1,
        savedAt: "2026-07-18T13:15:00.000Z",
        activeRoute: "scanner",
        pairing: { deviceId: null, deviceLabel: null },
        scanner: {
          eventId: "event-1",
          deviceId: "device-1",
          sessionId: "session-1",
          gate: "Gate A",
          manifest: manifest([item()]),
          localUsedTicketCodes: [],
          offlineQueue: [
            {
              code: "TIV-1",
              eventId: "event-1",
              deviceId: "device-1",
              sessionId: "session-1",
              scannedAt: SCANNED_AT,
              gate: "Gate A",
            },
          ],
        },
      })
    );

    expect(parsed).toMatchObject({
      ok: true,
      state: {
        scanner: {
          localUsedTicketCodes: ["TIV-1"],
        },
      },
    });
  });

  it("falls back to pairing when a persisted route has no scanner session", () => {
    const parsed = parseAccessAppStateSnapshot(
      JSON.stringify({
        schemaVersion: 1,
        savedAt: "2026-07-18T13:20:00.000Z",
        activeRoute: "settings",
        pairing: { deviceId: "device-1", deviceLabel: "Gate A" },
        scanner: null,
      })
    );

    expect(parsed).toMatchObject({
      ok: true,
      state: {
        activeRoute: "pair-device",
        scanner: null,
        pairing: {
          deviceId: "device-1",
          deviceLabel: "Gate A",
        },
      },
    });
  });

  it("returns null for invalid or unsupported stored state", async () => {
    const storage = new MemorySecureStorage();

    await storage.setItem(ACCESS_APP_STATE_STORAGE_KEY, "{bad json");
    expect(await loadAccessAppState(storage)).toBeNull();
    expect(parseAccessAppStateSnapshot("{bad json")).toEqual({
      ok: false,
      error: "invalid_json",
    });

    await storage.setItem(
      ACCESS_APP_STATE_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 2 })
    );
    expect(await loadAccessAppState(storage)).toBeNull();
    expect(parseAccessAppStateSnapshot(JSON.stringify({ schemaVersion: 2 }))).toEqual({
      ok: false,
      error: "unsupported_version",
    });
  });

  it("clears persisted app state", async () => {
    const storage = new MemorySecureStorage();

    await saveAccessAppState(storage, createAccessAppShellState());
    await clearAccessAppState(storage);

    expect(await loadAccessAppState(storage)).toBeNull();
  });
});
