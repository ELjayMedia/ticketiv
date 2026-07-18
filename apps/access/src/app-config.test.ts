import { describe, expect, it } from "vitest";

import {
  ACCESS_ANDROID_TARGETS,
  ACCESS_APP_CONFIG,
  ACCESS_APP_ID,
  ACCESS_SCHEME,
  buildAccessDeepLink,
  resolveAccessAndroidTarget,
} from "./app-config";

describe("Ticketiv Access app config", () => {
  it("pins the dedicated Access app identity", () => {
    expect(ACCESS_APP_CONFIG).toMatchObject({
      name: "Ticketiv Access",
      slug: "ticketiv-access",
      scheme: "ticketiv-access",
      androidPackage: "com.ticketiv.access",
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

  it("builds Ticketiv Access deep links", () => {
    expect(buildAccessDeepLink()).toBe("ticketiv-access://scan/setup");
    expect(buildAccessDeepLink("scan/setup?code=123456")).toBe(
      "ticketiv-access://scan/setup?code=123456"
    );
  });
});
