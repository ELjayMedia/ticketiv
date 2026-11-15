import {
  mergeScannerManifestDelta,
  type ScannerManifest,
  type ScannerOfflineScanPayload,
} from "@ticketiv/shared";
import {
  applyAccessScannerManifest,
  markAccessOfflineQueueSynced,
  type AccessScannerSessionState,
} from "./scanner-session";

export type AccessSyncFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export type AccessSyncClientConfig = {
  baseUrl: string;
  fetch: AccessSyncFetch;
};

export type AccessSyncErrorCode =
  | "network_error"
  | "manifest_failed"
  | "manifest_invalid"
  | "sync_failed"
  | "sync_invalid";

export type AccessSyncError = {
  code: AccessSyncErrorCode;
  message: string;
  status?: number;
};

export type AccessManifestRefreshResult =
  | {
      ok: true;
      state: AccessScannerSessionState;
      manifest: ScannerManifest;
      merged: boolean;
    }
  | {
      ok: false;
      state: AccessScannerSessionState;
      error: AccessSyncError;
    };

export type AccessOfflineQueueSyncResult =
  | {
      ok: true;
      state: AccessScannerSessionState;
      syncedCodes: string[];
      /** Terminal server rejections must be surfaced to gate staff. */
      rejected: Array<{ code: string; outcome: string }>;
      /** Scans not explicitly acknowledged remain safely queued. */
      pendingCount: number;
      skipped: boolean;
    }
  | {
      ok: false;
      state: AccessScannerSessionState;
      error: AccessSyncError;
    };

export type AccessFullSyncResult = {
  state: AccessScannerSessionState;
  manifest: AccessManifestRefreshResult;
  queue: AccessOfflineQueueSyncResult;
};

type SyncOfflineResponse = {
  synced?: unknown;
  queued?: unknown;
  results?: unknown;
};

export async function refreshAccessScannerManifest(
  config: AccessSyncClientConfig,
  state: AccessScannerSessionState,
  options: { since?: string | null } = {}
): Promise<AccessManifestRefreshResult> {
  const url = buildAccessManifestUrl(config.baseUrl, state, options.since ?? null);

  let response: Response;
  try {
    response = await config.fetch(url, { cache: "no-store" });
  } catch (error) {
    return {
      ok: false,
      state,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Manifest refresh failed",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      state,
      error: {
        code: "manifest_failed",
        message: await readResponseError(response, "Unable to refresh manifest"),
        status: response.status,
      },
    };
  }

  const manifest = await readJson(response);
  if (!isScannerManifest(manifest)) {
    return {
      ok: false,
      state,
      error: {
        code: "manifest_invalid",
        message: "Manifest response was invalid",
        status: response.status,
      },
    };
  }

  const existingManifest = state.manifest;
  const shouldMerge = Boolean(options.since && existingManifest) && manifest.eventId === state.eventId;
  const merged = shouldMerge && existingManifest
    ? mergeScannerManifestDelta(existingManifest, manifest)
    : manifest;

  return {
    ok: true,
    state: applyAccessScannerManifest(state, merged),
    manifest: merged,
    merged: merged !== manifest,
  };
}

export async function syncAccessOfflineQueue(
  config: AccessSyncClientConfig,
  state: AccessScannerSessionState
): Promise<AccessOfflineQueueSyncResult> {
  const scans = state.offlineQueue;
  if (scans.length === 0) {
    return {
      ok: true,
      state,
      syncedCodes: [],
      rejected: [],
      pendingCount: 0,
      skipped: true,
    };
  }

  let response: Response;
  try {
    response = await config.fetch(buildApiUrl(config.baseUrl, "/api/scanner/sync"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scans }),
    });
  } catch (error) {
    return {
      ok: false,
      state,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "Offline sync failed",
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      state,
      error: {
        code: "sync_failed",
        message: await readResponseError(response, "Unable to sync offline scans"),
        status: response.status,
      },
    };
  }

  const body = (await readJson(response)) as SyncOfflineResponse | null;
  const acknowledgements = extractAcknowledgements(body, scans);
  if (!acknowledgements || acknowledgements.processedCodes.length === 0) {
    return {
      ok: false,
      state,
      error: {
        code: "sync_invalid",
        message: "Scanner server did not acknowledge queued scans. Nothing was discarded.",
        status: response.status,
      },
    };
  }

  return {
    ok: true,
    state: markAccessOfflineQueueSynced(state, acknowledgements.processedCodes),
    syncedCodes: acknowledgements.syncedCodes,
    rejected: acknowledgements.rejected,
    pendingCount: scans.length - acknowledgements.processedCodes.length,
    skipped: false,
  };
}

export async function syncAccessScannerSession(
  config: AccessSyncClientConfig,
  state: AccessScannerSessionState
): Promise<AccessFullSyncResult> {
  const manifest = await refreshAccessScannerManifest(config, state, {
    since: state.manifest?.fetchedAt ?? null,
  });
  const queue = await syncAccessOfflineQueue(config, manifest.state);

  return {
    state: queue.state,
    manifest,
    queue,
  };
}

export function buildAccessManifestUrl(
  baseUrl: string,
  state: AccessScannerSessionState,
  since?: string | null
): string {
  const url = new URL("/api/scanner/manifest", normalizedBaseUrl(baseUrl));
  url.searchParams.set("eventId", state.eventId);
  if (since?.trim()) url.searchParams.set("since", since.trim());
  if (state.deviceId && state.sessionId) {
    url.searchParams.set("deviceId", state.deviceId);
    url.searchParams.set("sessionId", state.sessionId);
  }
  return url.toString();
}

function buildApiUrl(baseUrl: string, path: string): string {
  return new URL(path, normalizedBaseUrl(baseUrl)).toString();
}

function normalizedBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
}

async function readResponseError(response: Response, fallback: string): Promise<string> {
  const body = await readJson(response);
  if (isRecord(body) && typeof body.error === "string" && body.error.trim()) {
    return body.error.trim();
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Never trust a top-level "inserted" count, an echo of the request, or a
 * partially parsed response as proof of entry. Each scan is removed only after
 * its code has a server-authoritative terminal outcome.
 */
function extractAcknowledgements(
  body: SyncOfflineResponse | null,
  scans: ScannerOfflineScanPayload[],
): { processedCodes: string[]; syncedCodes: string[]; rejected: Array<{ code: string; outcome: string }> } | null {
  if (!body || !Array.isArray(body.results)) return null;
  const pending = new Set(scans.map((scan) => scan.code));
  const processed = new Set<string>();
  const syncedCodes: string[] = [];
  const rejected: Array<{ code: string; outcome: string }> = [];
  const terminalRejections = new Set(["duplicate", "not_found", "wrong_event", "revoked", "refunded", "transferred", "not_paid"]);
  for (const item of body.results) {
    if (!isRecord(item) || typeof item.code !== "string" || typeof item.outcome !== "string") continue;
    const code = item.code.trim();
    if (!pending.has(code) || processed.has(code)) continue;
    if (item.outcome === "validated") {
      processed.add(code);
      syncedCodes.push(code);
    } else if (terminalRejections.has(item.outcome)) {
      processed.add(code);
      rejected.push({ code, outcome: item.outcome });
    }
    // "error", "unauthorized", missing/unknown statuses stay in the queue.
  }
  return { processedCodes: [...processed], syncedCodes, rejected };
}

function isScannerManifest(value: unknown): value is ScannerManifest {
  if (!isRecord(value)) return false;
  return (
    typeof value.eventId === "string" &&
    typeof value.fetchedAt === "string" &&
    Array.isArray(value.items)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
