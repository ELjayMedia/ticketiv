import { describe, expect, it, vi } from "vitest";

import {
  createAccessSecureStorageAdapter,
  isAccessSecureStorageBridge,
  type AccessSecureStorageBridge,
} from "./native-secure-storage-adapter";

describe("Access native secure storage adapter", () => {
  it("rejects incomplete native bridges", () => {
    expect(isAccessSecureStorageBridge(null)).toBe(false);
    expect(isAccessSecureStorageBridge({ getItem: async () => null })).toBe(false);
    expect(
      isAccessSecureStorageBridge({
        getItem: async () => null,
        setItem: async () => undefined,
        removeItem: async () => undefined,
        reset: async () => undefined,
      })
    ).toBe(true);
  });

  it("passes storage operations through without transforming credentials", async () => {
    const getItem = vi.fn(async () => "encrypted-state");
    const setItem = vi.fn(async () => undefined);
    const removeItem = vi.fn(async () => undefined);
    const reset = vi.fn(async () => undefined);
    const bridge: AccessSecureStorageBridge = { getItem, setItem, removeItem, reset };
    const storage = createAccessSecureStorageAdapter(bridge);

    await expect(storage.getItem("ticketiv.access.app-state.v1")).resolves.toBe(
      "encrypted-state"
    );
    await storage.setItem("ticketiv.access.app-state.v1", "scanner-state");
    await storage.removeItem("ticketiv.access.app-state.v1");
    await storage.reset();

    expect(setItem).toHaveBeenCalledWith(
      "ticketiv.access.app-state.v1",
      "scanner-state"
    );
    expect(removeItem).toHaveBeenCalledWith("ticketiv.access.app-state.v1");
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
