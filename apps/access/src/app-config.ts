import { colors, fonts, radii, typography } from "@ticketiv/tokens";

export type AccessStoreTarget = "play" | "huawei";

export type AccessAndroidBuildVariant = "playRelease" | "huaweiRelease";

export type AccessNativeCapability =
  | "camera-scanning"
  | "secure-storage"
  | "offline-manifest"
  | "background-sync"
  | "device-pairing"
  | "remote-session-termination"
  | "nfc-feature-flag"
  | "fcm-push"
  | "hms-push";

export type AccessAndroidBuildTarget = {
  store: AccessStoreTarget;
  variant: AccessAndroidBuildVariant;
  artifactName: string;
  pushProvider: "fcm" | "hms";
  requiresGoogleMobileServices: boolean;
  capabilities: AccessNativeCapability[];
};

export const ACCESS_APP_NAME = "Ticketiv Access";
export const ACCESS_APP_ID = "com.ticketiv.access";
export const ACCESS_SCHEME = "ticketiv-access";
export const ACCESS_SLUG = "ticketiv-access";

export const ACCESS_ANDROID_TARGETS: Record<AccessStoreTarget, AccessAndroidBuildTarget> = {
  play: {
    store: "play",
    variant: "playRelease",
    artifactName: "ticketiv-access-play-release.aab",
    pushProvider: "fcm",
    requiresGoogleMobileServices: true,
    capabilities: [
      "camera-scanning",
      "secure-storage",
      "offline-manifest",
      "background-sync",
      "device-pairing",
      "remote-session-termination",
      "nfc-feature-flag",
      "fcm-push",
    ],
  },
  huawei: {
    store: "huawei",
    variant: "huaweiRelease",
    artifactName: "ticketiv-access-huawei-release.aab",
    pushProvider: "hms",
    requiresGoogleMobileServices: false,
    capabilities: [
      "camera-scanning",
      "secure-storage",
      "offline-manifest",
      "background-sync",
      "device-pairing",
      "remote-session-termination",
      "nfc-feature-flag",
      "hms-push",
    ],
  },
};

export const ACCESS_APP_THEME = {
  colors: {
    bg: colors.bg,
    surface: colors.surface,
    ink: colors.ink,
    ink3: colors.ink3,
    line: colors.line,
    accent: colors.accent,
    danger: colors.danger,
    success: colors.success,
    warning: colors.warning,
  },
  radii,
  typography,
  fonts,
} as const;

export const ACCESS_APP_CONFIG = {
  name: ACCESS_APP_NAME,
  slug: ACCESS_SLUG,
  scheme: ACCESS_SCHEME,
  androidPackage: ACCESS_APP_ID,
  androidTargets: ACCESS_ANDROID_TARGETS,
  theme: ACCESS_APP_THEME,
} as const;

export function resolveAccessAndroidTarget(value: string | null | undefined): AccessAndroidBuildTarget {
  const normalized = (value ?? "play")
    .trim()
    .toLowerCase()
    .replace(/[-_\s]/g, "");

  if (!normalized || normalized === "play" || normalized === "google" || normalized === "playrelease") {
    return ACCESS_ANDROID_TARGETS.play;
  }

  if (
    normalized === "huawei" ||
    normalized === "appgallery" ||
    normalized === "hms" ||
    normalized === "huaweirelease"
  ) {
    return ACCESS_ANDROID_TARGETS.huawei;
  }

  throw new Error(`Unsupported Ticketiv Access Android target: ${value}`);
}

export function buildAccessDeepLink(path = "/scan/setup"): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${ACCESS_SCHEME}://${safePath.replace(/^\//, "")}`;
}
