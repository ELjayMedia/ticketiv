import { describe, expect, it } from "vitest";

import type { ScannerManifest, ScannerManifestItem } from "@ticketiv/shared";
import {
  applyAccessScannerManifest,
  createAccessScannerSessionState,
  markAccessOfflineQueueSynced,
  scanAccessManifestTicket,
} from "./scanner-session";

const SCANNED_AT = "2026-07-18T12:30:00.000Z";

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
    fetchedAt: "2026-07-18T12:20:00.000Z",
    items,
  };
}

describe("Access scanner session core", () => {
  it("seeds local used codes from a fresh manifest", () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      manifest: manifest([
        item({ ticket_code: "TIV-1", already_checked_in: true }),
        item({ ticket_code: "TIV-2" }),
      ]),
      localUsedTicketCodes: ["LOCAL-1"],
    });

    expect(state.localUsedTicketCodes).toEqual(["LOCAL-1", "TIV-1"]);
  });

  it("queues manifest hits for offline sync and marks them locally used", () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "Main gate",
      manifest: manifest([item()]),
    });

    const outcome = scanAccessManifestTicket(state, {
      ticketCode: " TIV-1 ",
      scannedAt: SCANNED_AT,
    });

    expect(outcome).toMatchObject({
      action: "queue",
      shouldValidateOnline: false,
      result: {
        valid: true,
        status: "offline",
        inputMode: "qr",
        orderItemId: "item-1",
      },
      offlineScan: {
        code: "TIV-1",
        eventId: "event-1",
        deviceId: "device-1",
        sessionId: "session-1",
        gate: "Main gate",
        scannedAt: SCANNED_AT,
      },
    });
    expect(outcome.state.offlineQueue).toHaveLength(1);
    expect(outcome.state.localUsedTicketCodes).toContain("TIV-1");
  });

  it("turns a queued local ticket into a duplicate on the next scan", () => {
    const initial = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      manifest: manifest([item()]),
    });
    const first = scanAccessManifestTicket(initial, {
      ticketCode: "TIV-1",
      scannedAt: SCANNED_AT,
    });
    const second = scanAccessManifestTicket(first.state, {
      ticketCode: "TIV-1",
      scannedAt: "2026-07-18T12:31:00.000Z",
    });

    expect(second.action).toBe("duplicate");
    expect(second.result).toMatchObject({ valid: false, status: "duplicate" });
    expect(second.state.offlineQueue).toHaveLength(1);
  });

  it("falls through to online validation on manifest miss", () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      manifest: manifest([item({ ticket_code: "TIV-2" })]),
    });

    expect(
      scanAccessManifestTicket(state, {
        ticketCode: "TIV-1",
        scannedAt: SCANNED_AT,
      })
    ).toMatchObject({
      action: "miss",
      result: null,
      offlineScan: null,
      shouldValidateOnline: true,
    });
  });

  it("blocks transferred tickets from offline admission", () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      manifest: manifest([item({ status: "transferred" })]),
    });

    const outcome = scanAccessManifestTicket(state, {
      ticketCode: "TIV-1",
      scannedAt: SCANNED_AT,
    });

    expect(outcome.action).toBe("blocked");
    expect(outcome.result).toMatchObject({ valid: false, status: "transferred" });
    expect(outcome.offlineScan).toBeNull();
    expect(outcome.state.offlineQueue).toHaveLength(0);
  });

  it("applies refreshed manifests and clears synced scans by code", () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      manifest: manifest([item()]),
    });
    const queued = scanAccessManifestTicket(state, {
      ticketCode: "TIV-1",
      scannedAt: SCANNED_AT,
    }).state;
    const refreshed = applyAccessScannerManifest(
      queued,
      manifest([item({ ticket_code: "TIV-2", already_checked_in: true })])
    );

    expect(refreshed.localUsedTicketCodes).toEqual(["TIV-1", "TIV-2"]);
    expect(markAccessOfflineQueueSynced(refreshed, ["TIV-1"]).offlineQueue).toHaveLength(0);
  });

  it("rejects empty scan input without queueing", () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
    });

    expect(
      scanAccessManifestTicket(state, {
        ticketCode: " ",
        scannedAt: SCANNED_AT,
      })
    ).toMatchObject({
      action: "invalid_input",
      result: { valid: false, status: "error", message: "No QR code provided" },
      shouldValidateOnline: false,
    });
  });
});
