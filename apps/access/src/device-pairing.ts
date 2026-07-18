import {
  buildClaimDeviceSetupPayload,
  formatDeviceSetupCode,
  isDeviceSetupCodeReady,
  normalizeDeviceSetupCode,
  parseTicketivDeepLink,
  type ClaimedDeviceSetup,
  type ClaimDeviceSetupCodeRequest,
} from "@ticketiv/shared";
import {
  createAccessScannerSessionState,
  type AccessScannerSessionState,
} from "./scanner-session";

export type AccessPairingStatus = "idle" | "ready" | "claiming" | "paired" | "error";

export type AccessPairingState = {
  codeInput: string;
  normalizedCode: string;
  formattedCode: string;
  deviceId: string | null;
  deviceLabel: string | null;
  status: AccessPairingStatus;
  error: string | null;
  claimedSetup: ClaimedDeviceSetup | null;
};

export type CreateAccessPairingStateInput = {
  code?: string | null;
  deviceId?: string | null;
  deviceLabel?: string | null;
};

export type AccessPairingClaimDraft = {
  state: AccessPairingState;
  payload: ClaimDeviceSetupCodeRequest | null;
};

export function createAccessPairingState(
  input: CreateAccessPairingStateInput = {}
): AccessPairingState {
  const codeInput = input.code ?? "";
  const normalizedCode = normalizeDeviceSetupCode(codeInput);

  return {
    codeInput,
    normalizedCode,
    formattedCode: formatDeviceSetupCode(codeInput),
    deviceId: normalizeNullable(input.deviceId),
    deviceLabel: normalizeNullable(input.deviceLabel),
    status: isDeviceSetupCodeReady(codeInput) ? "ready" : "idle",
    error: null,
    claimedSetup: null,
  };
}

export function updateAccessPairingCode(
  state: AccessPairingState,
  codeInput: string
): AccessPairingState {
  const normalizedCode = normalizeDeviceSetupCode(codeInput);

  return {
    ...state,
    codeInput,
    normalizedCode,
    formattedCode: formatDeviceSetupCode(codeInput),
    status: isDeviceSetupCodeReady(codeInput) ? "ready" : "idle",
    error: null,
    claimedSetup: null,
  };
}

export function updateAccessPairingDeviceLabel(
  state: AccessPairingState,
  deviceLabel: string | null | undefined
): AccessPairingState {
  return {
    ...state,
    deviceLabel: normalizeNullable(deviceLabel),
  };
}

export function prefillAccessPairingFromDeepLink(
  state: AccessPairingState,
  deepLink: string
): AccessPairingState {
  const route = parseTicketivDeepLink(deepLink);
  if (route.kind !== "scanner-setup") return state;

  return updateAccessPairingCode(state, route.setupCode ?? "");
}

export function startAccessPairingClaim(
  state: AccessPairingState
): AccessPairingClaimDraft {
  if (!isDeviceSetupCodeReady(state.normalizedCode)) {
    return {
      state: {
        ...state,
        status: "error",
        error: "Enter a valid setup code",
      },
      payload: null,
    };
  }

  return {
    state: {
      ...state,
      status: "claiming",
      error: null,
      claimedSetup: null,
    },
    payload: buildClaimDeviceSetupPayload({
      code: state.normalizedCode,
      deviceId: state.deviceId,
      label: state.deviceLabel,
    }),
  };
}

export function completeAccessPairingClaim(
  state: AccessPairingState,
  claimedSetup: ClaimedDeviceSetup
): AccessPairingState {
  return {
    ...state,
    status: "paired",
    error: null,
    claimedSetup,
    deviceId: claimedSetup.device.id,
    deviceLabel: claimedSetup.device.label,
  };
}

export function failAccessPairingClaim(
  state: AccessPairingState,
  error: string
): AccessPairingState {
  return {
    ...state,
    status: "error",
    error: error.trim() || "Unable to pair device",
    claimedSetup: null,
  };
}

export function createAccessScannerSessionFromPairing(
  state: AccessPairingState
): AccessScannerSessionState | null {
  if (!state.claimedSetup) return null;

  return createAccessScannerSessionState({
    eventId: state.claimedSetup.event.id,
    deviceId: state.claimedSetup.device.id,
    sessionId: state.claimedSetup.session.id,
    gate: state.claimedSetup.device.label,
  });
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
