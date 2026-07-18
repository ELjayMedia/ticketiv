import { describe, expect, it } from "vitest";

import type { ClaimedDeviceSetup } from "@ticketiv/shared";
import {
  completeAccessPairingClaim,
  createAccessPairingState,
  createAccessScannerSessionFromPairing,
  failAccessPairingClaim,
  prefillAccessPairingFromDeepLink,
  startAccessPairingClaim,
  updateAccessPairingCode,
  updateAccessPairingDeviceLabel,
} from "./device-pairing";

const claimedSetup: ClaimedDeviceSetup = {
  device: {
    id: "device-1",
    label: "Main gate",
    device_role: "organizer_scanner",
    max_scans_per_minute: 120,
  },
  session: {
    id: "session-1",
    device_id: "device-1",
    started_at: "2026-07-18T12:45:00.000Z",
  },
  event: {
    id: "event-1",
    title: "Bushfire Friday",
    starts_at: "2026-08-01T18:00:00.000Z",
    venue_name: "House on Fire",
  },
};

describe("Access device pairing core", () => {
  it("normalizes setup-code entry into display and claim-ready state", () => {
    const state = updateAccessPairingCode(createAccessPairingState(), " ab-c 123 ");

    expect(state).toMatchObject({
      codeInput: " ab-c 123 ",
      normalizedCode: "ABC123",
      formattedCode: "ABC-123",
      status: "ready",
      error: null,
    });
  });

  it("prefills setup codes from Access custom-scheme links", () => {
    const state = prefillAccessPairingFromDeepLink(
      createAccessPairingState(),
      "ticketiv-access://scan/setup?code=abc-123"
    );

    expect(state.normalizedCode).toBe("ABC123");
    expect(state.formattedCode).toBe("ABC-123");
    expect(state.status).toBe("ready");
  });

  it("prefills setup codes from production web links", () => {
    const state = prefillAccessPairingFromDeepLink(
      createAccessPairingState(),
      "https://ticketiv.app/scan/setup?code=xyz-789"
    );

    expect(state.normalizedCode).toBe("XYZ789");
  });

  it("ignores unrelated deep links", () => {
    const state = createAccessPairingState({ code: "abc123" });

    expect(prefillAccessPairingFromDeepLink(state, "ticketiv://tickets")).toBe(state);
  });

  it("builds an API claim payload from pairing state", () => {
    const state = updateAccessPairingDeviceLabel(
      createAccessPairingState({
        code: "abc-123",
        deviceId: " device-1 ",
      }),
      " Main gate "
    );

    const draft = startAccessPairingClaim(state);

    expect(draft.state.status).toBe("claiming");
    expect(draft.payload).toEqual({
      code: "ABC123",
      deviceId: "device-1",
      label: "Main gate",
    });
  });

  it("does not build a claim payload for incomplete codes", () => {
    const draft = startAccessPairingClaim(createAccessPairingState({ code: "abc" }));

    expect(draft.payload).toBeNull();
    expect(draft.state).toMatchObject({
      status: "error",
      error: "Enter a valid setup code",
    });
  });

  it("stores claimed setup and creates scanner session state", () => {
    const paired = completeAccessPairingClaim(
      startAccessPairingClaim(createAccessPairingState({ code: "abc123" })).state,
      claimedSetup
    );

    expect(paired).toMatchObject({
      status: "paired",
      deviceId: "device-1",
      deviceLabel: "Main gate",
      claimedSetup,
    });
    expect(createAccessScannerSessionFromPairing(paired)).toMatchObject({
      eventId: "event-1",
      deviceId: "device-1",
      sessionId: "session-1",
      gate: "Main gate",
      offlineQueue: [],
    });
  });

  it("preserves pairing input when claim fails", () => {
    const failed = failAccessPairingClaim(
      startAccessPairingClaim(createAccessPairingState({ code: "abc123" })).state,
      "Setup code has expired"
    );

    expect(failed).toMatchObject({
      status: "error",
      normalizedCode: "ABC123",
      error: "Setup code has expired",
      claimedSetup: null,
    });
  });
});
