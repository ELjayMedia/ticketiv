import type { BrowserSessionAdapter } from "@ticketiv/adapters";
import { NativeModules, Platform } from "react-native";

import {
  createTicketivBrowserSessionAdapter,
  isTicketivBrowserSessionBridge,
} from "./native-browser-session-adapter";

export function getTicketivAndroidBrowserSession(): BrowserSessionAdapter | null {
  if (Platform.OS !== "android") return null;

  const bridge = NativeModules.TicketivBrowserSession as unknown;
  if (!isTicketivBrowserSessionBridge(bridge)) return null;

  return createTicketivBrowserSessionAdapter(bridge);
}
