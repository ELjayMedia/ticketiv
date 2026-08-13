import type { SecureStorageAdapter } from "@ticketiv/adapters";

export type AccessSecureStorageBridge = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  reset(): Promise<void>;
};

export type AccessSecureStorageAdapter = SecureStorageAdapter & {
  reset(): Promise<void>;
};

export function isAccessSecureStorageBridge(
  value: unknown
): value is AccessSecureStorageBridge {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AccessSecureStorageBridge>;
  return (
    typeof candidate.getItem === "function" &&
    typeof candidate.setItem === "function" &&
    typeof candidate.removeItem === "function" &&
    typeof candidate.reset === "function"
  );
}

export function createAccessSecureStorageAdapter(
  bridge: AccessSecureStorageBridge
): AccessSecureStorageAdapter {
  return {
    async getItem(key) {
      return bridge.getItem(key);
    },
    async setItem(key, value) {
      await bridge.setItem(key, value);
    },
    async removeItem(key) {
      await bridge.removeItem(key);
    },
    async reset() {
      await bridge.reset();
    },
  };
}
