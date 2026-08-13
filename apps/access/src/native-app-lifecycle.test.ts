import { describe, expect, it } from "vitest";

import type { SecureStorageAdapter } from "@ticketiv/adapters";
import { createAccessAppShellState } from "./app-shell";
import { createAccessPairingState } from "./device-pairing";
import { saveAccessAppState } from "./persistence";
import { createAccessScannerSessionState } from "./scanner-session";
import {
  bootAccessNativeAppShell,
  persistAccessNativeAppShell,
} from "./native-app-lifecycle";

class MemorySecureStorage implements SecureStorageAdapter {
  readonly values = new Map<string, string>();

  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  async removeItem(key: string) {
    this.values.delete(key);
  }
}

function pairedShell() {
  return createAccessAppShellState({
    pairing: createAccessPairingState({
      deviceId: "device-1",
      deviceLabel: "Gate A",
    }),
    scanner: createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "Gate A",
      offlineQueue: [
        {
          code: "TIV-OFFLINE-1",
          eventId: "event-1",
          deviceId: "device-1",
          sessionId: "session-1",
          scannedAt: "2026-08-13T09:00:00.000Z",
          gate: "Gate A",
        },
      ],
    }),
  });
}

describe("Access native app lifecycle", () => {
  it("restores paired session and queued scans before applying a setup deep link", async () => {
    const storage = new MemorySecureStorage();
    await saveAccessAppState(storage, pairedShell(), {
      savedAt: "2026-08-13T09:01:00.000Z",
    });

    const restored = await bootAccessNativeAppShell(
      storage,
      "ticketiv-access://scan/setup?code=abc123"
    );

    expect(restored.activeRoute).toBe("scanner");
    expect(restored.pairing.formattedCode).toBe("");
    expect(restored.scanner).toMatchObject({
      deviceId: "device-1",
      sessionId: "session-1",
      offlineQueue: [{ code: "TIV-OFFLINE-1" }],
      localUsedTicketCodes: ["TIV-OFFLINE-1"],
    });
  });

  it("persists active scanner credentials and clears them after session end", async () => {
    const storage = new MemorySecureStorage();

    await persistAccessNativeAppShell(storage, pairedShell());
    expect(storage.values.size).toBe(1);

    await persistAccessNativeAppShell(storage, createAccessAppShellState());
    expect(storage.values.size).toBe(0);
  });

  it("fails closed when encrypted storage contains a malformed scanner snapshot", async () => {
    const storage = new MemorySecureStorage();
    await storage.setItem("ticketiv.access.app-state.v1", "{bad json");

    await expect(bootAccessNativeAppShell(storage)).rejects.toThrow(
      "Stored Access scanner state is invalid_json."
    );
  });
});
