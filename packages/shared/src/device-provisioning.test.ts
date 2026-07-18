import { describe, expect, it } from "vitest";

import {
  buildClaimDeviceSetupPayload,
  formatDeviceSetupCode,
  isDeviceSetupCodeReady,
  normalizeDeviceSetupCode,
} from "./device-provisioning";

describe("shared device provisioning contracts", () => {
  it("normalizes pasted setup codes", () => {
    expect(normalizeDeviceSetupCode(" ab-c 123 ")).toBe("ABC123");
  });

  it("formats setup codes in scanner-friendly groups", () => {
    expect(formatDeviceSetupCode("abc123")).toBe("ABC-123");
    expect(formatDeviceSetupCode("ab")).toBe("AB");
  });

  it("reports readiness after normalization", () => {
    expect(isDeviceSetupCodeReady("abc-12")).toBe(false);
    expect(isDeviceSetupCodeReady("abc-123")).toBe(true);
  });

  it("builds the API claim payload without display separators", () => {
    expect(
      buildClaimDeviceSetupPayload({
        code: "abc-123",
        deviceId: " device-1 ",
        label: " Gate A ",
      })
    ).toEqual({
      code: "ABC123",
      deviceId: "device-1",
      label: "Gate A",
    });
  });
});
