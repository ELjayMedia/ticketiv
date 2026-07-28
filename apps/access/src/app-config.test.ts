import { describe, expect, it } from "vitest";

import {
  ACCESS_ANDROID_TARGETS,
  ACCESS_APP_CONFIG,
  ACCESS_APP_ID,
  ACCESS_IOS_TARGET,
  ACCESS_NATIVE_RELEASE_TARGETS,
  ACCESS_SCHEME,
  buildAccessDeepLink,
  resolveAccessAndroidTarget,
  resolveAccessIosTarget,
} from "./app-config";

describe("Ticketiv Access app config", () => {
  it("pins the dedicated Access app identity", () => {
    expect(ACCESS_APP_CONFIG).toMatchObject({
      name: "Ticketiv Access",
      slug: "ticketiv-access",
      scheme: "ticketiv-access",
      androidPackage: "com.ticketiv.access",
      iosBundleIdentifier: "com.ticketiv.access",
    });
    expect(ACCESS_APP_ID).toBe("com.ticketiv.access");
    expect(ACCESS_SCHEME).toBe("ticketiv-access");
  });

  it("resolves Play and Huawei Android build targets", () => {
    expect(resolveAccessAndroidTarget("playRelease")).toMatchObject({
      store: "play",
      variant: "playRelease",
      artifactName: "ticketiv-access-play-release.aab",
      pushProvider: "fcm",
      requiresGoogleMobileServices: true,
    });

    expect(resolveAccessAndroidTarget("appgallery")).toMatchObject({
      store: "huawei",
      variant: "huaweiRelease",
      artifactName: "ticketiv-access-huawei-release.aab",
      pushProvider: "hms",
      requiresGoogleMobileServices: false,
    });
  });

  it("keeps the Huawei target free of unconditional Google services", () => {
    expect(ACCESS_ANDROID_TARGETS.huawei.capabilities).toContain("hms-push");
    expect(ACCESS_ANDROID_TARGETS.huawei.capabilities).not.toContain("fcm-push");
    expect(ACCESS_ANDROID_TARGETS.huawei.requiresGoogleMobileServices).toBe(false);
  });

  it("pins the App Store build target", () => {
    expect(resolveAccessIosTarget("app-store")).toEqual(ACCESS_IOS_TARGET);
    expect(ACCESS_IOS_TARGET).toMatchObject({
      store: "app-store",
      variant: "iosRelease",
      artifactName: "ticketiv-access-ios-release.ipa",
      bundleIdentifier: "com.ticketiv.access",
      pushProvider: "apns",
    });
    expect(ACCESS_IOS_TARGET.capabilities).toContain("apns-push");
    expect(ACCESS_IOS_TARGET.capabilities).toContain("camera-scanning");
  });

  it("documents the full native release matrix", () => {
    expect(ACCESS_NATIVE_RELEASE_TARGETS.map((target) => target.variant)).toEqual([
      "playRelease",
      "huaweiRelease",
      "iosRelease",
    ]);
    expect(ACCESS_NATIVE_RELEASE_TARGETS.map((target) => target.artifactName)).toEqual([
      "ticketiv-access-play-release.aab",
      "ticketiv-access-huawei-release.aab",
      "ticketiv-access-ios-release.ipa",
    ]);
  });

  it("builds Ticketiv Access deep links", () => {
    expect(buildAccessDeepLink()).toBe("ticketiv-access://scan/setup");
    expect(buildAccessDeepLink("scan/setup?code=123456")).toBe(
      "ticketiv-access://scan/setup?code=123456"
    );
  });
});
