export type ProvisionedDeviceRole = "organizer_scanner" | "organizer_pos" | "organizer_kiosk";

export interface DeviceSetupCode {
  code: string;
  expiresAt: string;
  label: string;
  deviceRole: ProvisionedDeviceRole;
  maxScansPerMinute: number | null;
}

export interface ClaimDeviceSetupCodeRequest {
  code: string;
  deviceId?: string | null;
  label?: string | null;
}

export interface ClaimedDeviceSetup {
  device: {
    id: string;
    label: string | null;
    device_role: ProvisionedDeviceRole;
    max_scans_per_minute: number | null;
  };
  session: {
    id: string;
    device_id: string;
    started_at: string | null;
  };
  event: {
    id: string;
    title: string;
    starts_at: string | null;
    venue_name: string | null;
  };
}

export const DEVICE_SETUP_CODE_LENGTH = 6;
export const DEVICE_SETUP_CODE_GROUP_SIZE = 3;

export function normalizeDeviceSetupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatDeviceSetupCode(code: string): string {
  const normalized = normalizeDeviceSetupCode(code);
  return normalized.length > DEVICE_SETUP_CODE_GROUP_SIZE
    ? `${normalized.slice(0, DEVICE_SETUP_CODE_GROUP_SIZE)}-${normalized.slice(DEVICE_SETUP_CODE_GROUP_SIZE)}`
    : normalized;
}

export function isDeviceSetupCodeReady(code: string): boolean {
  return normalizeDeviceSetupCode(code).length >= DEVICE_SETUP_CODE_LENGTH;
}

export function buildClaimDeviceSetupPayload(
  input: ClaimDeviceSetupCodeRequest
): ClaimDeviceSetupCodeRequest {
  return {
    code: normalizeDeviceSetupCode(input.code),
    deviceId: normalizeOptional(input.deviceId),
    label: normalizeOptional(input.label),
  };
}

function normalizeOptional(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
