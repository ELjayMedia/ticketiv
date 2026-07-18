import { describe, expect, it, vi } from "vitest";

import type { ScannerManifest, ScannerManifestItem } from "@ticketiv/shared";
import { createAccessScannerSessionState } from "./scanner-session";
import {
  buildAccessValidateUrl,
  submitAccessQrScan,
  type AccessSyncClientConfig,
} from "./index";

const BASE_URL = "https://ticketiv.app";
const SCANNED_AT = "2026-07-18T13:00:00.000Z";

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
    fetchedAt: "2026-07-18T12:55:00.000Z",
    items,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("Access scan coordinator", () => {
  it("builds the validation endpoint URL from the configured base URL", () => {
    expect(buildAccessValidateUrl("https://ticketiv.app/")).toBe(
      "https://ticketiv.app/api/scanner/validate"
    );
  });

  it("uses the local manifest first and does not fetch for hits", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "North",
      manifest: manifest([item()]),
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>();

    const result = await submitAccessQrScan(
      { baseUrl: BASE_URL, fetch },
      state,
      { ticketCode: " TIV-1 ", scannedAt: SCANNED_AT }
    );

    expect(result).toMatchObject({
      source: "manifest",
      result: { valid: true, status: "validated", orderItemId: "item-1" },
      offlineScan: {
        code: "TIV-1",
        eventId: "event-1",
        deviceId: "device-1",
        sessionId: "session-1",
        gate: "North",
      },
    });
    expect(result.state.offlineQueue).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls back to live validation for manifest misses", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "North",
      manifest: manifest([item({ ticket_code: "TIV-2" })]),
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>().mockResolvedValue(
      jsonResponse({
        valid: true,
        status: "validated",
        inputMode: "qr",
        message: "Ticket checked in",
        orderItemId: "item-99",
      })
    );

    const result = await submitAccessQrScan(
      { baseUrl: BASE_URL, fetch },
      state,
      { ticketCode: "TIV-99", scannedAt: SCANNED_AT }
    );

    expect(result).toMatchObject({
      source: "online",
      onlineStatus: 200,
      result: { valid: true, status: "validated", orderItemId: "item-99" },
      offlineScan: null,
    });
    expect(result.state.localUsedTicketCodes).toContain("TIV-99");
    expect(fetch).toHaveBeenCalledWith(
      "https://ticketiv.app/api/scanner/validate",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: "TIV-99",
          eventId: "event-1",
          deviceId: "device-1",
          sessionId: "session-1",
          gate: "North",
          scannedAt: SCANNED_AT,
        }),
      })
    );
  });

  it("does not queue or mark local use when online validation rejects a code", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>().mockResolvedValue(
      jsonResponse(
        {
          valid: false,
          status: "not_found",
          inputMode: "qr",
          message: "Unknown ticket",
        },
        { status: 404 }
      )
    );

    const result = await submitAccessQrScan(
      { baseUrl: BASE_URL, fetch },
      state,
      { ticketCode: "UNKNOWN", scannedAt: SCANNED_AT }
    );

    expect(result).toMatchObject({
      source: "online",
      onlineStatus: 404,
      result: { valid: false, status: "not_found" },
      offlineScan: null,
    });
    expect(result.state.localUsedTicketCodes).not.toContain("UNKNOWN");
    expect(result.state.offlineQueue).toHaveLength(0);
  });

  it("returns a local duplicate before retrying a code already used online", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      localUsedTicketCodes: ["TIV-99"],
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>();

    const result = await submitAccessQrScan(
      { baseUrl: BASE_URL, fetch },
      state,
      { ticketCode: "TIV-99", scannedAt: SCANNED_AT }
    );

    expect(result).toMatchObject({
      source: "local_duplicate",
      result: { valid: false, status: "duplicate" },
      offlineScan: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("queues a fallback offline scan when network validation is unavailable", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: null,
      gate: "South",
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>().mockRejectedValue(new Error("fetch failed"));

    const result = await submitAccessQrScan(
      { baseUrl: BASE_URL, fetch },
      state,
      { ticketCode: "TIV-100", scannedAt: SCANNED_AT }
    );

    expect(result).toMatchObject({
      source: "offline_fallback",
      result: {
        valid: true,
        status: "offline",
        message: "Network unavailable. Scan stored offline.",
      },
      offlineScan: {
        code: "TIV-100",
        eventId: "event-1",
        deviceId: "device-1",
        sessionId: "offline-device-1",
        gate: "South",
      },
      error: { code: "network_error", message: "fetch failed" },
    });
    expect(result.state.offlineQueue).toHaveLength(1);
    expect(result.state.localUsedTicketCodes).toContain("TIV-100");
  });

  it("can return a network error without queueing when requested", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>().mockRejectedValue(new Error("offline"));

    const result = await submitAccessQrScan(
      { baseUrl: BASE_URL, fetch },
      state,
      {
        ticketCode: "TIV-100",
        scannedAt: SCANNED_AT,
        queueOnNetworkError: false,
      }
    );

    expect(result).toMatchObject({
      source: "online",
      result: { valid: false, status: "error", message: "offline" },
      offlineScan: null,
      error: { code: "network_error" },
    });
    expect(result.state.offlineQueue).toHaveLength(0);
  });

  it("rejects empty codes before any network call", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
    });
    const fetch = vi.fn<AccessSyncClientConfig["fetch"]>();

    const result = await submitAccessQrScan(
      { baseUrl: BASE_URL, fetch },
      state,
      { ticketCode: " ", scannedAt: SCANNED_AT }
    );

    expect(result).toMatchObject({
      source: "invalid_input",
      result: { valid: false, status: "error", message: "No QR code provided" },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
