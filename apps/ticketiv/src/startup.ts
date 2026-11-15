import type { SecureStorageAdapter } from "@ticketiv/adapters";

import {
  bootTicketivConsumerAppShell,
  type TicketivConsumerAppShellState,
} from "./app-shell";

/**
 * The Android Activity can be alive while the JS app is still loading storage
 * and its first deep link. A rejected native Promise must never become an
 * unhandled rejection that terminates a release build.
 *
 * Keep existing encrypted wallet data untouched on failure. The caller shows
 * a retry screen rather than silently replacing a saved wallet with an empty one.
 */
export type TicketivConsumerStartupResult =
  | { ok: true; state: TicketivConsumerAppShellState }
  | { ok: false; error: unknown };

export async function bootTicketivConsumerAppSafely(input: {
  readInitialUrl: () => Promise<string | null>;
  storage: SecureStorageAdapter | null;
}): Promise<TicketivConsumerStartupResult> {
  try {
    const initialUrl = await input.readInitialUrl();
    const state = await bootTicketivConsumerAppShell({
      initialUrl,
      storage: input.storage,
    });
    return { ok: true, state };
  } catch (error) {
    return { ok: false, error };
  }
}
