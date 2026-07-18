import { colors, fonts, radii, typography } from "@ticketiv/tokens";

export type TicketivConsumerStoreTarget = "play" | "huawei";

export type TicketivConsumerAndroidBuildVariant = "playRelease" | "huaweiRelease";

export type TicketivConsumerNativeCapability =
  | "event-discovery"
  | "hosted-checkout"
  | "offline-tickets"
  | "qr-display"
  | "ticket-transfer"
  | "refunds"
  | "transaction-history"
  | "secure-storage"
  | "universal-links"
  | "google-wallet"
  | "fcm-push"
  | "hms-push"
  | "gms-free-fallbacks";

export type TicketivConsumerAndroidBuildTarget = {
  store: TicketivConsumerStoreTarget;
  variant: TicketivConsumerAndroidBuildVariant;
  artifactName: string;
  pushProvider: "fcm" | "hms";
  walletProvider: "google-wallet" | "in-app-ticket";
  requiresGoogleMobileServices: boolean;
  capabilities: TicketivConsumerNativeCapability[];
};

export const TICKETIV_APP_NAME = "Ticketiv";
export const TICKETIV_APP_ID = "com.ticketiv.app";
export const TICKETIV_SCHEME = "ticketiv";
export const TICKETIV_SLUG = "ticketiv";

export const TICKETIV_ANDROID_TARGETS: Record<
  TicketivConsumerStoreTarget,
  TicketivConsumerAndroidBuildTarget
> = {
  play: {
    store: "play",
    variant: "playRelease",
    artifactName: "ticketiv-play-release.aab",
    pushProvider: "fcm",
    walletProvider: "google-wallet",
    requiresGoogleMobileServices: true,
    capabilities: [
      "event-discovery",
      "hosted-checkout",
      "offline-tickets",
      "qr-display",
      "ticket-transfer",
      "refunds",
      "transaction-history",
      "secure-storage",
      "universal-links",
      "google-wallet",
      "fcm-push",
    ],
  },
  huawei: {
    store: "huawei",
    variant: "huaweiRelease",
    artifactName: "ticketiv-huawei-release.aab",
    pushProvider: "hms",
    walletProvider: "in-app-ticket",
    requiresGoogleMobileServices: false,
    capabilities: [
      "event-discovery",
      "hosted-checkout",
      "offline-tickets",
      "qr-display",
      "ticket-transfer",
      "refunds",
      "transaction-history",
      "secure-storage",
      "universal-links",
      "hms-push",
      "gms-free-fallbacks",
    ],
  },
};

export const TICKETIV_APP_THEME = {
  colors: {
    bg: colors.bg,
    surface: colors.surface,
    ink: colors.ink,
    ink2: colors.ink2,
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

export const TICKETIV_APP_CONFIG = {
  name: TICKETIV_APP_NAME,
  slug: TICKETIV_SLUG,
  scheme: TICKETIV_SCHEME,
  androidPackage: TICKETIV_APP_ID,
  androidTargets: TICKETIV_ANDROID_TARGETS,
  theme: TICKETIV_APP_THEME,
} as const;

export function resolveTicketivAndroidTarget(
  value: string | null | undefined
): TicketivConsumerAndroidBuildTarget {
  const normalized = (value ?? "play")
    .trim()
    .toLowerCase()
    .replace(/[-_\s]/g, "");

  if (!normalized || normalized === "play" || normalized === "google" || normalized === "playrelease") {
    return TICKETIV_ANDROID_TARGETS.play;
  }

  if (
    normalized === "huawei" ||
    normalized === "appgallery" ||
    normalized === "hms" ||
    normalized === "huaweirelease"
  ) {
    return TICKETIV_ANDROID_TARGETS.huawei;
  }

  throw new Error(`Unsupported Ticketiv Android target: ${value}`);
}

export function buildTicketivDeepLink(path = "/tickets"): string {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return `${TICKETIV_SCHEME}://${safePath.replace(/^\//, "")}`;
}
