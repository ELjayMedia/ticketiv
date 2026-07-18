import { describe, expect, it } from "vitest";

import type { ClaimedDeviceSetup } from "@ticketiv/shared";
import {
  applyAccessSetupDeepLink,
  completeAccessAppPairing,
  createAccessAppShellState,
  endAccessScannerSession,
} from "./app-shell";

const claimedSetup: ClaimedDeviceSetup = {
  device: {
    id: "device-1",
    label: "Gate A",
    device_role: "organizer_scanner",
    max_scans_per_minute: 90,
  },
  session: {
    id: "session-1",
    device_id: "device-1",
    started_at: "2026-07-18T12:55:00.000Z",
  },
  event: {
    id: "event-1",
    title: "Launch Night",
    starts_at: "2026-08-01T18:00:00.000Z",
    venue_name: "The Arena",
  },
};

describe("Access app shell state", () => {
  it("starts on pairing when no scanner session exists", () => {
    expect(createAccessAppShellState()).toMatchObject({
      activeRoute: "pair-device",
      scanner: null,
    });
  });

  it("routes setup deep links into pairing state", () => {
    const state = applyAccessSetupDeepLink(
      createAccessAppShellState(),
      "ticketiv-access://scan/setup?code=abc123"
    );

    expect(state.activeRoute).toBe("pair-device");
    expect(state.pairing).toMatchObject({
      normalizedCode: "ABC123",
      formattedCode: "ABC-123",
      status: "ready",
    });
  });

  it("moves to scanner after pairing completes", () => {
    const paired = completeAccessAppPairing(createAccessAppShellState(), claimedSetup);

    expect(paired.activeRoute).toBe("scanner");
    expect(paired.scanner).toMatchObject({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "Gate A",
    });
  });

  it("returns to pairing after scanner session ends", () => {
    const paired = completeAccessAppPairing(createAccessAppShellState(), claimedSetup);
    const ended = endAccessScannerSession(paired);

    expect(ended.activeRoute).toBe("pair-device");
    expect(ended.scanner).toBeNull();
  });
});
