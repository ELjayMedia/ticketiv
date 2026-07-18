import { describe, expect, it } from "vitest";

import {
  TICKETIV_ANDROID_TARGETS,
  TICKETIV_APP_CONFIG,
  TICKETIV_APP_ID,
  TICKETIV_SCHEME,
  buildTicketivDeepLink,
  resolveTicketivAndroidTarget,
} from "./app-config";

describe("Ticketiv consumer app config", () => {
  it("pins the consumer app identity", () => {
    expect(TICKETIV_APP_CONFIG).toMatchObject({
      name: "Ticketiv",
      slug: "ticketiv",
      scheme: "ticketiv",
      androidPackage: "com.ticketiv.app",
    });
    expect(TICKETIV_APP_ID).toBe("com.ticketiv.app");
    expect(TICKETIV_SCHEME).toBe("ticketiv");
  });

  it("resolves Play and Huawei Android build targets", () => {
    expect(resolveTicketivAndroidTarget("playRelease")).toMatchObject({
      store: "play",
      variant: "playRelease",
      artifactName: "ticketiv-play-release.aab",
      pushProvider: "fcm",
      walletProvider: "google-wallet",
      requiresGoogleMobileServices: true,
    });

    expect(resolveTicketivAndroidTarget("appgallery")).toMatchObject({
      store: "huawei",
      variant: "huaweiRelease",
      artifactName: "ticketiv-huawei-release.aab",
      pushProvider: "hms",
      walletProvider: "in-app-ticket",
      requiresGoogleMobileServices: false,
    });
  });

  it("keeps the Huawei target free of unconditional Google services", () => {
    expect(TICKETIV_ANDROID_TARGETS.huawei.capabilities).toContain("hms-push");
    expect(TICKETIV_ANDROID_TARGETS.huawei.capabilities).toContain("gms-free-fallbacks");
    expect(TICKETIV_ANDROID_TARGETS.huawei.capabilities).not.toContain("fcm-push");
    expect(TICKETIV_ANDROID_TARGETS.huawei.capabilities).not.toContain("google-wallet");
    expect(TICKETIV_ANDROID_TARGETS.huawei.requiresGoogleMobileServices).toBe(false);
  });

  it("builds Ticketiv deep links", () => {
    expect(buildTicketivDeepLink()).toBe("ticketiv://tickets");
    expect(buildTicketivDeepLink("t/order-token")).toBe("ticketiv://t/order-token");
  });
});
