import { NativeModules, Platform } from "react-native";
import type { SecureStorageAdapter } from "@ticketiv/adapters";

import {
  createTicketivSecureStorageAdapter,
  isTicketivSecureStorageBridge,
} from "./native-secure-storage-adapter";

export function getTicketivAndroidSecureStorage(): SecureStorageAdapter | null {
  if (Platform.OS !== "android") return null;

  const bridge = NativeModules.TicketivSecureStorage as unknown;
  if (!isTicketivSecureStorageBridge(bridge)) return null;

  return createTicketivSecureStorageAdapter(bridge);
}
