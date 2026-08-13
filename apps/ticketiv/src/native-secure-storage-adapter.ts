import type { SecureStorageAdapter } from "@ticketiv/adapters";

export type TicketivSecureStorageBridge = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export function isTicketivSecureStorageBridge(
  value: unknown
): value is TicketivSecureStorageBridge {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<TicketivSecureStorageBridge>;
  return (
    typeof candidate.getItem === "function" &&
    typeof candidate.setItem === "function" &&
    typeof candidate.removeItem === "function"
  );
}

export function createTicketivSecureStorageAdapter(
  bridge: TicketivSecureStorageBridge
): SecureStorageAdapter {
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
  };
}
