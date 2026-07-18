export const MOBILE_PLATFORM_FAMILIES = [
  "apple",
  "google",
  "huawei",
  "web",
] as const;

export type MobilePlatformFamily = (typeof MOBILE_PLATFORM_FAMILIES)[number];

export type PermissionStatus =
  | "granted"
  | "denied"
  | "prompt"
  | "unavailable";

export type PushRegistration = {
  provider: "apns" | "fcm" | "hms";
  token: string;
  deviceId: string;
};

export type WalletPassInput = {
  orderId: string;
  ticketId?: string;
  token: string;
};

export type BrowserSessionPresentation =
  | "custom_tab"
  | "auth_session"
  | "external_browser";

export type BrowserSessionInput = {
  url: string;
  callbackUrl?: string | null;
  presentation?: BrowserSessionPresentation;
  prefersEphemeralSession?: boolean;
};

export type ScanFrame = {
  value: string;
  format: "qr" | "barcode" | "unknown";
  scannedAt: string;
};

export type NfcReadResult = {
  uid: string;
  technology: "iso14443" | "desfire" | "unknown";
  scannedAt: string;
};

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export interface SecureStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface PushAdapter {
  family: MobilePlatformFamily;
  getPermissionStatus(): Promise<PermissionStatus>;
  requestPermission(): Promise<PermissionStatus>;
  registerDevice(deviceId: string): Promise<PushRegistration | null>;
  unregisterDevice(deviceId: string): Promise<void>;
}

export interface WalletPassAdapter {
  family: MobilePlatformFamily;
  canAddPass(): Promise<boolean>;
  addPass(input: WalletPassInput): Promise<void>;
}

export interface BrowserSessionAdapter {
  openSession(input: BrowserSessionInput): Promise<void>;
}

export interface CameraScannerAdapter {
  getPermissionStatus(): Promise<PermissionStatus>;
  requestPermission(): Promise<PermissionStatus>;
  startScanning(onFrame: (frame: ScanFrame) => void): Promise<() => void>;
}

export interface NfcAdapter {
  isAvailable(): Promise<boolean>;
  startSession(onRead: (result: NfcReadResult) => void): Promise<() => void>;
}

export interface MapAdapter {
  openDirections(destination: GeoPoint, label?: string): Promise<void>;
}

export type TicketivPlatformAdapters = {
  secureStorage: SecureStorageAdapter;
  browserSession?: BrowserSessionAdapter;
  push?: PushAdapter;
  wallet?: WalletPassAdapter;
  cameraScanner?: CameraScannerAdapter;
  nfc?: NfcAdapter;
  maps?: MapAdapter;
};

export type TicketivPlatformAdapterName = keyof TicketivPlatformAdapters;

export const DEFAULT_REQUIRED_PLATFORM_ADAPTERS = [
  "secureStorage",
] as const satisfies ReadonlyArray<TicketivPlatformAdapterName>;

export class MissingPlatformAdaptersError extends Error {
  readonly missing: TicketivPlatformAdapterName[];

  constructor(missing: ReadonlyArray<TicketivPlatformAdapterName>) {
    super(`Missing platform adapter(s): ${missing.join(", ")}`);
    this.name = "MissingPlatformAdaptersError";
    this.missing = [...missing];
  }
}

export function isMobilePlatformFamily(
  value: unknown
): value is MobilePlatformFamily {
  return (
    typeof value === "string" &&
    MOBILE_PLATFORM_FAMILIES.includes(value as MobilePlatformFamily)
  );
}

export function getMissingPlatformAdapters(
  adapters: Partial<TicketivPlatformAdapters> | null | undefined,
  required: ReadonlyArray<TicketivPlatformAdapterName> =
    DEFAULT_REQUIRED_PLATFORM_ADAPTERS
): TicketivPlatformAdapterName[] {
  return required.filter((name) => !adapters?.[name]);
}

export function assertPlatformAdapters(
  adapters: Partial<TicketivPlatformAdapters> | null | undefined,
  required: ReadonlyArray<TicketivPlatformAdapterName> =
    DEFAULT_REQUIRED_PLATFORM_ADAPTERS
): asserts adapters is TicketivPlatformAdapters {
  const missing = getMissingPlatformAdapters(adapters, required);
  if (missing.length > 0) throw new MissingPlatformAdaptersError(missing);
}
