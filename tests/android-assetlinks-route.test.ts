import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GET,
  parseSha256Fingerprints,
} from "@/app/.well-known/assetlinks.json/route";

const FINGERPRINT_A = Array.from({ length: 32 }, () => "AB").join(":");
const FINGERPRINT_B_COMPACT = "cd".repeat(32);
const FINGERPRINT_B = Array.from({ length: 32 }, () => "CD").join(":");

describe("Android Digital Asset Links", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalizes and deduplicates Play signing certificate fingerprints", () => {
    expect(
      parseSha256Fingerprints(
        `${FINGERPRINT_A.toLowerCase()},\n${FINGERPRINT_B_COMPACT},${FINGERPRINT_A}`,
      ),
    ).toEqual([FINGERPRINT_A, FINGERPRINT_B]);
  });

  it("serves the Ticketiv Android package association", async () => {
    vi.stubEnv(
      "TICKETIV_PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINTS",
      `${FINGERPRINT_A},${FINGERPRINT_B_COMPACT}`,
    );

    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    await expect(response.json()).resolves.toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.ticketiv.app",
          sha256_cert_fingerprints: [FINGERPRINT_A, FINGERPRINT_B],
        },
      },
    ]);
  });

  it.each([undefined, "not-a-certificate", `${FINGERPRINT_A},invalid`])(
    "fails closed without caching a missing or malformed certificate: %s",
    async (fingerprints) => {
      if (fingerprints === undefined) {
        vi.stubEnv("TICKETIV_PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINTS", "");
      } else {
        vi.stubEnv(
          "TICKETIV_PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINTS",
          fingerprints,
        );
      }

      const response = GET();

      expect(response.status).toBe(503);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe(
        "private, no-store, max-age=0",
      );
      await expect(response.json()).resolves.toEqual({
        error: "android_app_links_unavailable",
      });
    },
  );
});
