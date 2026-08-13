import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANDROID_PACKAGE_NAME = "com.ticketiv.app";
const HANDLE_ALL_URLS_RELATION = "delegate_permission/common.handle_all_urls";
const VALID_CACHE_CONTROL =
  "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
const UNAVAILABLE_CACHE_CONTROL = "private, no-store, max-age=0";

export function parseSha256Fingerprints(value: string | undefined) {
  if (!value?.trim()) return null;

  const fingerprints = value
    .split(/[\n,]+/)
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean)
    .map((fingerprint) => {
      const compactFingerprint = fingerprint.replaceAll(":", "");
      if (!/^[0-9a-fA-F]{64}$/.test(compactFingerprint)) return null;

      return compactFingerprint
        .toUpperCase()
        .match(/.{2}/g)
        ?.join(":");
    });

  if (fingerprints.length === 0 || fingerprints.some((fingerprint) => !fingerprint)) {
    return null;
  }

  return [...new Set(fingerprints as string[])];
}

export function GET() {
  const fingerprints = parseSha256Fingerprints(
    process.env.TICKETIV_PLAY_APP_SIGNING_SHA256_CERT_FINGERPRINTS,
  );

  if (!fingerprints) {
    return NextResponse.json(
      { error: "android_app_links_unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": UNAVAILABLE_CACHE_CONTROL },
      },
    );
  }

  return NextResponse.json(
    [
      {
        relation: [HANDLE_ALL_URLS_RELATION],
        target: {
          namespace: "android_app",
          package_name: ANDROID_PACKAGE_NAME,
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ],
    { headers: { "Cache-Control": VALID_CACHE_CONTROL } },
  );
}
