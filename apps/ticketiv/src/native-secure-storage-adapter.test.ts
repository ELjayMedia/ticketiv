import { describe, expect, it, vi } from "vitest";

import {
  createTicketivSecureStorageAdapter,
  isTicketivSecureStorageBridge,
  type TicketivSecureStorageBridge,
} from "./native-secure-storage-adapter";

describe("Ticketiv native secure-storage adapter", () => {
  it("accepts only a complete native bridge", () => {
    expect(isTicketivSecureStorageBridge(null)).toBe(false);
    expect(isTicketivSecureStorageBridge({ getItem: async () => null })).toBe(false);
    expect(
      isTicketivSecureStorageBridge({
        getItem: async () => null,
        setItem: async () => undefined,
        removeItem: async () => undefined,
      })
    ).toBe(true);
  });

  it("passes wallet storage operations through without transforming values", async () => {
    const getItem = vi.fn(async (key: string) => (key.endsWith("wallet.v1") ? "encrypted-value" : null));
    const setItem = vi.fn(async () => undefined);
    const removeItem = vi.fn(async () => undefined);
    const bridge: TicketivSecureStorageBridge = { getItem, setItem, removeItem };
    const storage = createTicketivSecureStorageAdapter(bridge);

    await expect(storage.getItem("ticketiv.consumer.wallet.v1")).resolves.toBe("encrypted-value");
    await storage.setItem("ticketiv.consumer.wallet.v1", "wallet-json");
    await storage.removeItem("ticketiv.consumer.wallet.v1");

    expect(getItem).toHaveBeenCalledWith("ticketiv.consumer.wallet.v1");
    expect(setItem).toHaveBeenCalledWith("ticketiv.consumer.wallet.v1", "wallet-json");
    expect(removeItem).toHaveBeenCalledWith("ticketiv.consumer.wallet.v1");
  });

  it("propagates native failures so callers never mistake a failed secure write for persistence", async () => {
    const failure = new Error("keystore unavailable");
    const storage = createTicketivSecureStorageAdapter({
      getItem: async () => null,
      setItem: async () => {
        throw failure;
      },
      removeItem: async () => undefined,
    });

    await expect(storage.setItem("ticketiv.consumer.wallet.v1", "wallet-json")).rejects.toBe(failure);
  });
});
