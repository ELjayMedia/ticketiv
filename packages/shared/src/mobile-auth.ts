export type TicketivMobileApp = "consumer" | "access";

export type AuthFlowIntent =
  | "sign-in"
  | "sign-up"
  | "magic-link"
  | "reset-password";

export type AuthRedirectConfig = {
  scheme: string;
  app: TicketivMobileApp;
  intent: AuthFlowIntent;
  nextPath?: string | null;
};

export type ParsedDeepLinkParams = Record<string, string>;

export type TicketivDeepLinkRoute =
  | {
      kind: "auth-callback";
      app: TicketivMobileApp | "unknown";
      code: string | null;
      tokenHash: string | null;
      type: string | null;
      nextPath: string | null;
      params: ParsedDeepLinkParams;
    }
  | {
      kind: "ticket";
      token: string;
      params: ParsedDeepLinkParams;
    }
  | {
      kind: "event";
      slugOrId: string;
      params: ParsedDeepLinkParams;
    }
  | {
      kind: "scanner-setup";
      setupCode: string | null;
      params: ParsedDeepLinkParams;
    }
  | {
      kind: "account-settings";
      params: ParsedDeepLinkParams;
    }
  | {
      kind: "unknown";
      path: string;
      params: ParsedDeepLinkParams;
    };

export type ParseDeepLinkOptions = {
  allowedWebHosts?: ReadonlyArray<string>;
};

const DEFAULT_WEB_HOSTS = ["ticketiv.app", "www.ticketiv.app"] as const;

export function buildMobileAuthRedirectUri(config: AuthRedirectConfig): string {
  const url = new URL(`${stripTrailingColon(config.scheme)}://auth/callback`);
  url.searchParams.set("app", config.app);
  url.searchParams.set("intent", config.intent);

  const nextPath = normalizeAppPath(config.nextPath);
  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}

export function parseTicketivDeepLink(
  input: string,
  options: ParseDeepLinkOptions = {}
): TicketivDeepLinkRoute {
  const parsed = parseUrl(input);
  if (!parsed) {
    return { kind: "unknown", path: input, params: {} };
  }

  const allowedHosts = options.allowedWebHosts ?? DEFAULT_WEB_HOSTS;
  const isWebLink = parsed.protocol === "https:" || parsed.protocol === "http:";
  if (isWebLink && !allowedHosts.includes(parsed.hostname)) {
    return {
      kind: "unknown",
      path: parsed.pathname,
      params: searchParamsToRecord(parsed.searchParams),
    };
  }

  const path = getDeepLinkPath(parsed);
  const params = searchParamsToRecord(parsed.searchParams);
  const segments = path.split("/").filter(Boolean);

  if (segments[0] === "auth" && segments[1] === "callback") {
    return {
      kind: "auth-callback",
      app: parseMobileApp(parsed.searchParams.get("app")),
      code: parsed.searchParams.get("code"),
      tokenHash: parsed.searchParams.get("token_hash"),
      type: parsed.searchParams.get("type"),
      nextPath: normalizeAppPath(parsed.searchParams.get("next")),
      params,
    };
  }

  if (segments[0] === "t" && segments[1]) {
    return { kind: "ticket", token: segments[1], params };
  }

  if (segments[0] === "events" && segments[1]) {
    return { kind: "event", slugOrId: segments[1], params };
  }

  if (segments[0] === "scan" && segments[1] === "setup") {
    return {
      kind: "scanner-setup",
      setupCode: parsed.searchParams.get("code"),
      params,
    };
  }

  if (path === "/account/settings") {
    return { kind: "account-settings", params };
  }

  return { kind: "unknown", path, params };
}

export function normalizeAppPath(path: string | null | undefined): string | null {
  if (!path) return null;

  const trimmed = path.trim();
  if (!trimmed || trimmed.startsWith("//")) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const parsed = parseUrl(trimmed);
    if (!parsed) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function getDeepLinkPath(url: URL): string {
  if (url.protocol === "https:" || url.protocol === "http:") {
    return url.pathname || "/";
  }

  const hostPath = url.hostname ? `/${url.hostname}` : "";
  return `${hostPath}${url.pathname || ""}` || "/";
}

function parseMobileApp(value: string | null): TicketivMobileApp | "unknown" {
  return value === "consumer" || value === "access" ? value : "unknown";
}

function parseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}

function searchParamsToRecord(params: URLSearchParams): ParsedDeepLinkParams {
  const record: ParsedDeepLinkParams = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

function stripTrailingColon(scheme: string): string {
  return scheme.endsWith(":") ? scheme.slice(0, -1) : scheme;
}
