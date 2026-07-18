import { describe, expect, it } from "vitest";

import {
  MissingPlatformAdaptersError,
  assertPlatformAdapters,
  getMissingPlatformAdapters,
  isMobilePlatformFamily,
  type SecureStorageAdapter,
} from "./index";

const secureStorage: SecureStorageAdapter = {
  async getItem() {
    return null;
  },
  async setItem() {},
  async removeItem() {},
};

describe("@ticketiv/adapters", () => {
  it("recognizes supported mobile platform families", () => {
    expect(isMobilePlatformFamily("apple")).toBe(true);
    expect(isMobilePlatformFamily("google")).toBe(true);
    expect(isMobilePlatformFamily("huawei")).toBe(true);
    expect(isMobilePlatformFamily("web")).toBe(true);
    expect(isMobilePlatformFamily("windows-phone")).toBe(false);
    expect(isMobilePlatformFamily(null)).toBe(false);
  });

  it("reports missing required platform adapters", () => {
    expect(getMissingPlatformAdapters(null)).toEqual(["secureStorage"]);
    expect(getMissingPlatformAdapters({ secureStorage })).toEqual([]);
    expect(
      getMissingPlatformAdapters(
        { secureStorage },
        ["secureStorage", "cameraScanner", "nfc"]
      )
    ).toEqual(["cameraScanner", "nfc"]);
  });

  it("throws a typed error when required platform adapters are missing", () => {
    expect(() => assertPlatformAdapters({}, ["secureStorage", "maps"])).toThrow(
      MissingPlatformAdaptersError
    );

    try {
      assertPlatformAdapters({}, ["secureStorage", "maps"]);
    } catch (error) {
      expect(error).toBeInstanceOf(MissingPlatformAdaptersError);
      expect((error as MissingPlatformAdaptersError).missing).toEqual([
        "secureStorage",
        "maps",
      ]);
    }
  });

  it("accepts adapter sets with the required adapters present", () => {
    expect(() =>
      assertPlatformAdapters({ secureStorage }, ["secureStorage"])
    ).not.toThrow();
  });
});
