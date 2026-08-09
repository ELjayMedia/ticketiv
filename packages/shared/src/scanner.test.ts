import { describe, expect, it } from "vitest";

import {
  checkedInTicketCodesFromManifest,
  copyForScannerStatus,
  evaluateScannerOfflineManifest,
  findScannerManifestItem,
  mergeScannerManifestDelta,
  scannerResultFromPayload,
  scannerStatusTitle,
  scannerStatusTone,
  type ScannerManifest,
  type ScannerManifestItem,
} from "./scanner";

const SCANNED_AT = "2026-07-18T12:00:00.000Z";

function manifest(items: ScannerManifestItem[], fetchedAt = "2026-07-18T11:55:00.000Z"): ScannerManifest {
  return {
    eventId: "event-1",
    fetchedAt,
    items,
  };
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

describe("shared scanner contracts", () => {
  it("normalizes legacy QR scan outcomes", () => {
    const result = scannerResultFromPayload(
      {
        outcome: "already_used",
        message: "Ticket already checked in",
        ticket: {
          id: "order-item-1",
          type: "General entry",
          checked_in_at: "2026-07-15T12:00:00.000Z",
        },
      },
      false,
      "qr"
    );

    expect(result).toMatchObject({
      valid: false,
      status: "duplicate",
      inputMode: "qr",
      message: "Ticket already checked in",
      orderItemId: "order-item-1",
      ticketTypeName: "General entry",
      checkedInAt: "2026-07-15T12:00:00.000Z",
    });
  });

  it("keeps scanner-specific TapBand statuses visible", () => {
    const result = scannerResultFromPayload(
      {
        valid: false,
        status: "tapband_no_entitlement",
        inputMode: "tapband",
      },
      false,
      "qr"
    );

    expect(scannerStatusTitle(result.status, result.inputMode)).toBe("No ticket for this event");
    expect(scannerStatusTone(result.status)).toBe("danger");
    expect(copyForScannerStatus(result.status).title).toBe("No TapBand ticket");
  });

  it("finds and merges manifest entries without browser storage", () => {
    const existing = manifest([
      item({ ticket_code: "TIV-1", order_item_id: "item-1" }),
      item({ ticket_code: "TIV-2", order_item_id: "item-2" }),
    ]);
    const delta = manifest(
      [
        item({ ticket_code: "TIV-1", order_item_id: "item-1", already_checked_in: true }),
        item({ ticket_code: "TIV-3", order_item_id: "item-3" }),
      ],
      "2026-07-18T12:01:00.000Z"
    );

    const merged = mergeScannerManifestDelta(existing, delta);

    expect(merged.fetchedAt).toBe(delta.fetchedAt);
    expect(merged.items).toHaveLength(3);
    expect(findScannerManifestItem(merged, "TIV-1")).toMatchObject({ already_checked_in: true });
    expect(checkedInTicketCodesFromManifest(merged)).toEqual(["TIV-1"]);
  });

  it("queues an issued manifest hit for offline sync", () => {
    const evaluation = evaluateScannerOfflineManifest({
      manifest: manifest([item()]),
      ticketCode: " TIV-1 ",
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      scannedAt: SCANNED_AT,
    });

    expect(evaluation).toMatchObject({
      action: "queue",
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
        scannedAt: SCANNED_AT,
      },
    });
    expect(scannerStatusTitle("offline", "qr")).toBe("Stored offline");
    expect(scannerStatusTone("offline")).toBe("warning");
  });

  it.each([
    ["server manifest", item({ already_checked_in: true })],
    ["checked-in status", item({ status: "checked_in" })],
  ])("blocks duplicates from %s", (_label, duplicateItem) => {
    const evaluation = evaluateScannerOfflineManifest({
      manifest: manifest([duplicateItem]),
      ticketCode: "TIV-1",
      eventId: "event-1",
      scannedAt: SCANNED_AT,
    });

    expect(evaluation.action).toBe("duplicate");
    expect(evaluation.result).toMatchObject({
      valid: false,
      status: "duplicate",
      message: "Already used",
    });
    expect(evaluation.offlineScan).toBeNull();
  });

  it("blocks locally used tickets before the network sync catches up", () => {
    const evaluation = evaluateScannerOfflineManifest({
      manifest: manifest([item()]),
      ticketCode: "TIV-1",
      eventId: "event-1",
      scannedAt: SCANNED_AT,
      locallyUsed: true,
    });

    expect(evaluation.action).toBe("duplicate");
    expect(evaluation.offlineScan).toBeNull();
  });

  it.each(["revoked", "refunded", "transferred"] as const)(
    "blocks %s manifest tickets",
    (status) => {
      const evaluation = evaluateScannerOfflineManifest({
        manifest: manifest([item({ status })]),
        ticketCode: "TIV-1",
        eventId: "event-1",
        scannedAt: SCANNED_AT,
      });

      expect(evaluation.action).toBe("blocked");
      expect(evaluation.result).toMatchObject({ valid: false, status });
      expect(copyForScannerStatus(status).tone).toBe("danger");
    }
  );

  it("returns a miss when the manifest does not contain the code", () => {
    expect(
      evaluateScannerOfflineManifest({
        manifest: manifest([item({ ticket_code: "TIV-2" })]),
        ticketCode: "TIV-1",
        eventId: "event-1",
        scannedAt: SCANNED_AT,
      })
    ).toMatchObject({ action: "miss", item: null, result: null, offlineScan: null });
  });
});
