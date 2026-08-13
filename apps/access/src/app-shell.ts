import type { ClaimedDeviceSetup } from "@ticketiv/shared";
import {
  completeAccessPairingClaim,
  createAccessPairingState,
  createAccessScannerSessionFromPairing,
  prefillAccessPairingFromDeepLink,
  type AccessPairingState,
} from "./device-pairing";
import type { AccessScannerSessionState } from "./scanner-session";

export type AccessShellRoute = "pair-device" | "scanner" | "sync" | "settings";

export type AccessAppShellState = {
  activeRoute: AccessShellRoute;
  pairing: AccessPairingState;
  scanner: AccessScannerSessionState | null;
};

export type CreateAccessAppShellStateInput = {
  pairing?: AccessPairingState;
  scanner?: AccessScannerSessionState | null;
  activeRoute?: AccessShellRoute;
};

export function createAccessAppShellState(
  input: CreateAccessAppShellStateInput = {}
): AccessAppShellState {
  const scanner = input.scanner ?? null;

  return {
    activeRoute: input.activeRoute ?? (scanner ? "scanner" : "pair-device"),
    pairing: input.pairing ?? createAccessPairingState(),
    scanner,
  };
}

export function applyAccessSetupDeepLink(
  state: AccessAppShellState,
  deepLink: string
): AccessAppShellState {
  if (state.scanner) return state;

  return {
    ...state,
    activeRoute: "pair-device",
    pairing: prefillAccessPairingFromDeepLink(state.pairing, deepLink),
  };
}

export function completeAccessAppPairing(
  state: AccessAppShellState,
  claimedSetup: ClaimedDeviceSetup
): AccessAppShellState {
  const pairing = completeAccessPairingClaim(state.pairing, claimedSetup);

  return {
    ...state,
    activeRoute: "scanner",
    pairing,
    scanner: createAccessScannerSessionFromPairing(pairing),
  };
}

export function endAccessScannerSession(state: AccessAppShellState): AccessAppShellState {
  return {
    ...state,
    activeRoute: "pair-device",
    pairing: createAccessPairingState({
      deviceId: state.pairing.deviceId,
      deviceLabel: state.pairing.deviceLabel,
    }),
    scanner: null,
  };
}
