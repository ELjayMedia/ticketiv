import { describe, expect, it, vi } from "vitest";

import type { ScannerManifest, ScannerManifestItem } from "@ticketiv/shared";
import { createAccessScannerSessionState } from "./scanner-session";
import {
  buildAccessManifestUrl,
  refreshAccessScannerManifest,
  syncAccessOfflineQueue,
  syncAccessScannerSession,
  type AccessSyncFetch,
} from "./sync";

const BASE_URL = "https://ticketiv.app";
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

function manifest(items: ScannerManifestItem[], fetchedAt = "2026-07-18T12:20:00.000Z"): ScannerManifest {
  return {
    eventId: "event-1",
    fetchedAt,
    items,
  };
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

describe("Access scanner sync", () => {
  it("builds device-session manifest URLs with optional delta cursor", () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
    });

    expect(buildAccessManifestUrl(BASE_URL, state, "2026-07-18T12:00:00.000Z")).toBe(
      "https://ticketiv.app/api/scanner/manifest?eventId=event-1&since=2026-07-18T12%3A00%3A00.000Z&deviceId=device-1&sessionId=session-1"
    );
  });

  it("refreshes and applies a full manifest", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
    });
    const fetch = vi.fn<AccessSyncFetch>().mockResolvedValue(jsonResponse(manifest([item()])));

    const result = await refreshAccessScannerManifest({ baseUrl: BASE_URL, fetch }, state);

    expect(result).toMatchObject({ ok: true, merged: false });
    expect(fetch).toHaveBeenCalledWith(
      "https://ticketiv.app/api/scanner/manifest?eventId=event-1&deviceId=device-1&sessionId=session-1",
      { cache: "no-store" }
    );
    if (result.ok) {
      expect(result.state.manifest?.items).toHaveLength(1);
    }
  });

  it("merges delta manifests and seeds checked-in server codes", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      manifest: manifest([item({ ticket_code: "TIV-1" })], "2026-07-18T12:20:00.000Z"),
    });
    const fetch = vi.fn<AccessSyncFetch>().mockResolvedValue(
      jsonResponse(
        manifest(
          [
            item({
              ticket_code: "TIV-2",
              order_item_id: "item-2",
              already_checked_in: true,
            }),
          ],
          "2026-07-18T12:25:00.000Z"
        )
      )
    );

    const result = await refreshAccessScannerManifest(
      { baseUrl: BASE_URL, fetch },
      state,
      { since: state.manifest?.fetchedAt }
    );

    expect(result).toMatchObject({ ok: true, merged: true });
    if (result.ok) {
      expect(result.state.manifest?.items.map((entry) => entry.ticket_code)).toEqual(["TIV-1", "TIV-2"]);
      expect(result.state.localUsedTicketCodes).toContain("TIV-2");
    }
  });

  it("posts queued offline scans and clears processed codes", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      offlineQueue: [
        {
          code: "TIV-1",
          eventId: "event-1",
          deviceId: "device-1",
          sessionId: "session-1",
          scannedAt: SCANNED_AT,
          gate: "Main",
        },
      ],
    });
    const fetch = vi.fn<AccessSyncFetch>().mockResolvedValue(
      jsonResponse({
        inserted: 1,
        results: [{ code: "TIV-1", outcome: "validated", idempotent: false }],
      })
    );

    const result = await syncAccessOfflineQueue({ baseUrl: BASE_URL, fetch }, state);

    expect(result).toMatchObject({ ok: true, syncedCodes: ["TIV-1"], skipped: false });
    expect(fetch).toHaveBeenCalledWith(
      "https://ticketiv.app/api/scanner/sync",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
      })
    );
    if (result.ok) {
      expect(result.state.offlineQueue).toHaveLength(0);
    }
  });

  it("skips offline sync when there is no queued work", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
    });
    const fetch = vi.fn<AccessSyncFetch>();

    const result = await syncAccessOfflineQueue({ baseUrl: BASE_URL, fetch }, state);

    expect(result).toMatchObject({ ok: true, skipped: true, syncedCodes: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps scanner state when manifest refresh fails", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
    });
    const fetch = vi.fn<AccessSyncFetch>().mockResolvedValue(jsonResponse({ error: "Session expired" }, { status: 401 }));

    const result = await refreshAccessScannerManifest({ baseUrl: BASE_URL, fetch }, state);

    expect(result).toMatchObject({
      ok: false,
      state,
      error: { code: "manifest_failed", message: "Session expired", status: 401 },
    });
  });

  it("runs manifest refresh before offline queue sync in a full session sync", async () => {
    const state = createAccessScannerSessionState({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      manifest: manifest([item()], "2026-07-18T12:20:00.000Z"),
      offlineQueue: [
        {
          code: "TIV-1",
          eventId: "event-1",
          deviceId: "device-1",
          sessionId: "session-1",
          scannedAt: SCANNED_AT,
        },
      ],
    });
    const fetch = vi
      .fn<AccessSyncFetch>()
      .mockResolvedValueOnce(jsonResponse(manifest([item({ ticket_code: "TIV-2" })], "2026-07-18T12:25:00.000Z")))
      .mockResolvedValueOnce(jsonResponse({ inserted: 1, results: [{ code: "TIV-1", outcome: "validated" }] }));

    const result = await syncAccessScannerSession({ baseUrl: BASE_URL, fetch }, state);

    expect(result.manifest).toMatchObject({ ok: true });
    expect(result.queue).toMatchObject({ ok: true, syncedCodes: ["TIV-1"] });
    expect(result.state.offlineQueue).toHaveLength(0);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
