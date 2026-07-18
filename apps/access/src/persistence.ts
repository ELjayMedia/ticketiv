import {
  type ScannerManifest,
  type ScannerManifestItem,
  type ScannerManifestItemStatus,
  type ScannerOfflineScanPayload,
  type SecureStorageAdapter,
} from "@ticketiv/shared";
import {
  createAccessAppShellState,
  type AccessAppShellState,
  type AccessShellRoute,
} from "./app-shell";
import { createAccessPairingState } from "./device-pairing";
import {
  createAccessScannerSessionState,
  type AccessScannerSessionState,
} from "./scanner-session";

export const ACCESS_APP_STATE_SCHEMA_VERSION = 1;
export const ACCESS_APP_STATE_STORAGE_KEY = "ticketiv.access.app-state.v1";

export type AccessPersistedPairingState = {
  deviceId: string | null;
  deviceLabel: string | null;
};

export type AccessPersistedAppStateV1 = {
  schemaVersion: typeof ACCESS_APP_STATE_SCHEMA_VERSION;
  savedAt: string;
  activeRoute: AccessShellRoute;
  pairing: AccessPersistedPairingState;
  scanner: AccessScannerSessionState | null;
};

export type AccessAppStateParseError =
  | "empty"
  | "invalid_json"
  | "unsupported_version"
  | "invalid_shape";

export type AccessAppStateParseResult =
  | {
      ok: true;
      snapshot: AccessPersistedAppStateV1;
      state: AccessAppShellState;
    }
  | {
      ok: false;
      error: AccessAppStateParseError;
    };

export type AccessAppStateStorageOptions = {
  key?: string;
};

export type SaveAccessAppStateOptions = AccessAppStateStorageOptions & {
  savedAt?: string;
};

const ROUTES = new Set<AccessShellRoute>([
  "pair-device",
  "scanner",
  "sync",
  "settings",
]);
const MANIFEST_ITEM_STATUSES = new Set<ScannerManifestItemStatus>([
  "issued",
  "transferred",
  "checked_in",
  "revoked",
  "refunded",
]);

export function snapshotAccessAppState(
  state: AccessAppShellState,
  savedAt = new Date().toISOString()
): AccessPersistedAppStateV1 {
  const scanner = state.scanner ? createAccessScannerSessionState(state.scanner) : null;

  return {
    schemaVersion: ACCESS_APP_STATE_SCHEMA_VERSION,
    savedAt,
    activeRoute: scanner ? state.activeRoute : "pair-device",
    pairing: {
      deviceId: normalizeNullable(state.pairing.deviceId ?? scanner?.deviceId),
      deviceLabel: normalizeNullable(state.pairing.deviceLabel ?? scanner?.gate),
    },
    scanner,
  };
}

export function restoreAccessAppStateSnapshot(
  snapshot: AccessPersistedAppStateV1
): AccessAppShellState {
  const scanner = snapshot.scanner
    ? createAccessScannerSessionState(snapshot.scanner)
    : null;

  return createAccessAppShellState({
    activeRoute: scanner ? snapshot.activeRoute : "pair-device",
    pairing: createAccessPairingState({
      deviceId: snapshot.pairing.deviceId,
      deviceLabel: snapshot.pairing.deviceLabel ?? scanner?.gate,
    }),
    scanner,
  });
}

export function serializeAccessAppState(
  state: AccessAppShellState,
  savedAt?: string
): string {
  return JSON.stringify(snapshotAccessAppState(state, savedAt));
}

export function parseAccessAppStateSnapshot(
  value: string | null | undefined
): AccessAppStateParseResult {
  if (!value) return { ok: false, error: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  const record = asRecord(parsed);
  if (
    record &&
    typeof record.schemaVersion === "number" &&
    record.schemaVersion !== ACCESS_APP_STATE_SCHEMA_VERSION
  ) {
    return { ok: false, error: "unsupported_version" };
  }

  if (!isPersistedAppState(parsed)) {
    return { ok: false, error: "invalid_shape" };
  }

  return {
    ok: true,
    snapshot: parsed,
    state: restoreAccessAppStateSnapshot(parsed),
  };
}

export async function saveAccessAppState(
  storage: SecureStorageAdapter,
  state: AccessAppShellState,
  options: SaveAccessAppStateOptions = {}
): Promise<void> {
  await storage.setItem(
    options.key ?? ACCESS_APP_STATE_STORAGE_KEY,
    serializeAccessAppState(state, options.savedAt)
  );
}

export async function loadAccessAppState(
  storage: SecureStorageAdapter,
  options: AccessAppStateStorageOptions = {}
): Promise<AccessAppShellState | null> {
  const raw = await storage.getItem(options.key ?? ACCESS_APP_STATE_STORAGE_KEY);
  const parsed = parseAccessAppStateSnapshot(raw);
  return parsed.ok ? parsed.state : null;
}

export async function clearAccessAppState(
  storage: SecureStorageAdapter,
  options: AccessAppStateStorageOptions = {}
): Promise<void> {
  await storage.removeItem(options.key ?? ACCESS_APP_STATE_STORAGE_KEY);
}

function isPersistedAppState(value: unknown): value is AccessPersistedAppStateV1 {
  const record = asRecord(value);
  if (!record) return false;

  return (
    record.schemaVersion === ACCESS_APP_STATE_SCHEMA_VERSION &&
    typeof record.savedAt === "string" &&
    isAccessShellRoute(record.activeRoute) &&
    isPersistedPairing(record.pairing) &&
    (record.scanner === null || isPersistedScannerSession(record.scanner))
  );
}

function isPersistedPairing(value: unknown): value is AccessPersistedPairingState {
  const record = asRecord(value);
  if (!record) return false;

  return isNullableString(record.deviceId) && isNullableString(record.deviceLabel);
}

function isPersistedScannerSession(value: unknown): value is AccessScannerSessionState {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.eventId === "string" &&
    typeof record.deviceId === "string" &&
    isNullableString(record.sessionId) &&
    isNullableString(record.gate) &&
    (record.manifest === null || isScannerManifest(record.manifest)) &&
    isStringArray(record.localUsedTicketCodes) &&
    Array.isArray(record.offlineQueue) &&
    record.offlineQueue.every(isScannerOfflineScan)
  );
}

function isScannerManifest(value: unknown): value is ScannerManifest {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.eventId === "string" &&
    typeof record.fetchedAt === "string" &&
    Array.isArray(record.items) &&
    record.items.every(isScannerManifestItem)
  );
}

function isScannerManifestItem(value: unknown): value is ScannerManifestItem {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.ticket_code === "string" &&
    typeof record.order_item_id === "string" &&
    typeof record.ticket_type_id === "string" &&
    typeof record.status === "string" &&
    MANIFEST_ITEM_STATUSES.has(record.status as ScannerManifestItemStatus) &&
    typeof record.already_checked_in === "boolean"
  );
}

function isScannerOfflineScan(value: unknown): value is ScannerOfflineScanPayload {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.code === "string" &&
    typeof record.eventId === "string" &&
    isNullableOptionalString(record.deviceId) &&
    isNullableOptionalString(record.sessionId) &&
    typeof record.scannedAt === "string" &&
    isNullableOptionalString(record.gate)
  );
}

function isAccessShellRoute(value: unknown): value is AccessShellRoute {
  return typeof value === "string" && ROUTES.has(value as AccessShellRoute);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableOptionalString(value: unknown): value is string | null | undefined {
  return value === undefined || isNullableString(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
