import { NativeModules, Platform } from "react-native";

import {
  createAccessSecureStorageAdapter,
  isAccessSecureStorageBridge,
  type AccessSecureStorageAdapter,
} from "./native-secure-storage-adapter";

export function getAccessAndroidSecureStorage(): AccessSecureStorageAdapter | null {
  if (Platform.OS !== "android") return null;

  const bridge = NativeModules.TicketivAccessSecureStorage as unknown;
  if (!isAccessSecureStorageBridge(bridge)) return null;

  return createAccessSecureStorageAdapter(bridge);
}
