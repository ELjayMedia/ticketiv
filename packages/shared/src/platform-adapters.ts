export type MobilePlatformFamily = "apple" | "google" | "huawei" | "web";

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
  push?: PushAdapter;
  wallet?: WalletPassAdapter;
  cameraScanner?: CameraScannerAdapter;
  nfc?: NfcAdapter;
  maps?: MapAdapter;
};
