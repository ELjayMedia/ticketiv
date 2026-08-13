import type { SecureStorageAdapter } from "@ticketiv/adapters";

import {
  applyAccessSetupDeepLink,
  createAccessAppShellState,
  type AccessAppShellState,
} from "./app-shell";
import {
  ACCESS_APP_STATE_STORAGE_KEY,
  clearAccessAppState,
  parseAccessAppStateSnapshot,
  saveAccessAppState,
  type SaveAccessAppStateOptions,
} from "./persistence";

export async function bootAccessNativeAppShell(
  storage: SecureStorageAdapter,
  initialUrl?: string | null
): Promise<AccessAppShellState> {
  const raw = await storage.getItem(ACCESS_APP_STATE_STORAGE_KEY);
  const parsed = parseAccessAppStateSnapshot(raw);
  if (!parsed.ok && parsed.error !== "empty") {
    throw new Error(`Stored Access scanner state is ${parsed.error}.`);
  }

  const state = parsed.ok ? parsed.state : createAccessAppShellState();
  return initialUrl ? applyAccessSetupDeepLink(state, initialUrl) : state;
}

export async function persistAccessNativeAppShell(
  storage: SecureStorageAdapter,
  state: AccessAppShellState,
  options: SaveAccessAppStateOptions = {}
): Promise<void> {
  if (!state.scanner) {
    await clearAccessAppState(storage, options);
    return;
  }

  await saveAccessAppState(storage, state, options);
}
