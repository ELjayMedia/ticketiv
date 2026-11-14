import { describe, expect, it, vi } from "vitest";
import type { SecureStorageAdapter } from "@ticketiv/adapters";

import { bootTicketivConsumerAppSafely } from "./startup";

describe("Ticketiv native startup error handling", () => {
  it("opens Discover for a fresh install without storage state", async () => {
    const result = await bootTicketivConsumerAppSafely({
      readInitialUrl: async () => null,
      storage: null,
    });

    expect(result).toMatchObject({
      ok: true,
      state: {
        activeRoute: { route: "discover" },
        wallet: { tickets: [] },
      },
    });
  });

  it("returns a recoverable result when the Android deep-link Promise rejects", async () => {
    const result = await bootTicketivConsumerAppSafely({
      readInitialUrl: async () => {
        throw new Error("Linking is unavailable");
      },
      storage: null,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "Linking is unavailable" },
    });
  });

  it("does not clear encrypted wallet data when secure storage rejects", async () => {
    const getItem = vi.fn(async () => {
      throw new Error("Android Keystore temporarily unavailable");
    });
    const removeItem = vi.fn(async () => {});
    const setItem = vi.fn(async () => {});
    const storage: SecureStorageAdapter = { getItem, removeItem, setItem };

    const result = await bootTicketivConsumerAppSafely({
      readInitialUrl: async () => null,
      storage,
    });

    expect(result).toMatchObject({
      ok: false,
      error: { message: "Android Keystore temporarily unavailable" },
    });
    expect(getItem).toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it("can retry after a transient read error without losing the saved wallet", async () => {
    const walletKey = "ticketiv.consumer.wallet.v1";
    const wallet = JSON.stringify({
      schemaVersion: 1,
      syncedAt: null,
      tickets: [],
    });
    const getItem = vi.fn(async (key: string) => (key === walletKey ? wallet : null));
    getItem.mockRejectedValueOnce(new Error("temporary failure"));
    const storage: SecureStorageAdapter = {
      getItem,
      setItem: vi.fn(async () => {}),
      removeItem: vi.fn(async () => {}),
    };
    const input = { readInitialUrl: async () => null, storage };

    const first = await bootTicketivConsumerAppSafely(input);
    const retry = await bootTicketivConsumerAppSafely(input);

    expect(first.ok).toBe(false);
    expect(retry).toMatchObject({
      ok: true,
      state: { wallet: { schemaVersion: 1, tickets: [] } },
    });
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
