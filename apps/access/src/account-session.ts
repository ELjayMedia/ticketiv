/**
 * Email + password sign-in for Ticketiv Organizer (ADR 0002).
 *
 * Talks to Supabase Auth's REST endpoints directly with the publishable key
 * (the same public key the website ships), so Supabase's per-device rate
 * limits apply and no extra SDK is needed. The session lives in the app's
 * encrypted native storage, never in plain AsyncStorage.
 */

export type OrganizerAccountSession = {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
  userId: string;
  email: string | null;
};

export type AccountAuthConfig = {
  supabaseUrl: string;
  publishableKey: string;
  fetch: typeof fetch;
  now?: () => number;
};

export type AccountAuthErrorKind =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "rate_limited"
  | "session_expired"
  | "network"
  | "unknown";

export class AccountAuthError extends Error {
  constructor(
    readonly kind: AccountAuthErrorKind,
    message: string
  ) {
    super(message);
    this.name = "AccountAuthError";
  }
}

export const ORGANIZER_ACCOUNT_SESSION_KEY = "ticketiv.organizer.account-session.v1";

/** Refresh this long before the access token actually expires. */
const REFRESH_SKEW_MS = 60_000;

const MESSAGES: Record<AccountAuthErrorKind, string> = {
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Confirm your email address first. Check your inbox for the link from Ticketiv.",
  rate_limited: "Too many attempts. Wait a minute and try again.",
  session_expired: "Your session has ended. Sign in again.",
  network: "Can't reach Ticketiv. Check your connection and try again.",
  unknown: "Sign-in failed. Try again.",
};

export function accountAuthMessage(kind: AccountAuthErrorKind): string {
  return MESSAGES[kind];
}

function authUrl(config: AccountAuthConfig, path: string): string {
  return `${config.supabaseUrl.replace(/\/+$/, "")}/auth/v1/${path}`;
}

function headers(config: AccountAuthConfig, accessToken?: string): Record<string, string> {
  return {
    apikey: config.publishableKey,
    "content-type": "application/json",
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  };
}

function classifyAuthFailure(status: number, body: unknown, grant: "password" | "refresh_token"): AccountAuthErrorKind {
  if (status === 429) return "rate_limited";
  const record = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const code = String(record.error_code ?? record.error ?? "").toLowerCase();
  const text = String(record.msg ?? record.error_description ?? record.message ?? "").toLowerCase();

  if (code === "email_not_confirmed" || text.includes("email not confirmed")) return "email_not_confirmed";
  if (grant === "refresh_token" && (status === 400 || status === 401 || status === 403)) return "session_expired";
  if (code === "invalid_credentials" || code === "invalid_grant" || text.includes("invalid login credentials")) {
    return "invalid_credentials";
  }
  return status >= 400 && status < 500 ? "invalid_credentials" : "unknown";
}

export function parseAccountSession(value: unknown, now: number): OrganizerAccountSession | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  const user = (body.user && typeof body.user === "object" ? body.user : {}) as Record<string, unknown>;
  if (typeof body.access_token !== "string" || typeof body.refresh_token !== "string" || typeof user.id !== "string") {
    return null;
  }
  const expiresAt =
    typeof body.expires_at === "number"
      ? body.expires_at * 1000
      : now + (typeof body.expires_in === "number" ? body.expires_in : 3600) * 1000;
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt,
    userId: user.id,
    email: typeof user.email === "string" ? user.email : null,
  };
}

async function tokenRequest(
  config: AccountAuthConfig,
  grant: "password" | "refresh_token",
  payload: Record<string, string>
): Promise<OrganizerAccountSession> {
  let response: Response;
  try {
    response = await config.fetch(authUrl(config, `token?grant_type=${grant}`), {
      method: "POST",
      headers: headers(config),
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AccountAuthError("network", MESSAGES.network);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const kind = classifyAuthFailure(response.status, body, grant);
    throw new AccountAuthError(kind, MESSAGES[kind]);
  }
  const session = parseAccountSession(body, (config.now ?? Date.now)());
  if (!session) throw new AccountAuthError("unknown", MESSAGES.unknown);
  return session;
}

export function signInWithPassword(
  config: AccountAuthConfig,
  email: string,
  password: string
): Promise<OrganizerAccountSession> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !password) {
    return Promise.reject(new AccountAuthError("invalid_credentials", "Enter your email and password."));
  }
  return tokenRequest(config, "password", { email: trimmed, password });
}

export function refreshAccountSession(
  config: AccountAuthConfig,
  session: OrganizerAccountSession
): Promise<OrganizerAccountSession> {
  return tokenRequest(config, "refresh_token", { refresh_token: session.refreshToken });
}

export function sessionNeedsRefresh(session: OrganizerAccountSession, now: number): boolean {
  return session.expiresAt - REFRESH_SKEW_MS <= now;
}

/** Revoke the refresh token on the server. Best effort: local sign-out never waits on the network. */
export async function signOutAccount(config: AccountAuthConfig, session: OrganizerAccountSession): Promise<void> {
  try {
    await config.fetch(authUrl(config, "logout?scope=local"), {
      method: "POST",
      headers: headers(config, session.accessToken),
    });
  } catch {
    // Offline: the token still expires on its own.
  }
}

export type AccountSessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem?(key: string): Promise<void>;
};

export async function loadAccountSession(storage: AccountSessionStorage): Promise<OrganizerAccountSession | null> {
  const raw = await storage.getItem(ORGANIZER_ACCOUNT_SESSION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<OrganizerAccountSession>;
    if (
      typeof value.accessToken === "string" &&
      typeof value.refreshToken === "string" &&
      typeof value.expiresAt === "number" &&
      typeof value.userId === "string"
    ) {
      return {
        accessToken: value.accessToken,
        refreshToken: value.refreshToken,
        expiresAt: value.expiresAt,
        userId: value.userId,
        email: typeof value.email === "string" ? value.email : null,
      };
    }
  } catch {
    // Corrupt entry: treat as signed out.
  }
  return null;
}

export function saveAccountSession(storage: AccountSessionStorage, session: OrganizerAccountSession): Promise<void> {
  return storage.setItem(ORGANIZER_ACCOUNT_SESSION_KEY, JSON.stringify(session));
}

export async function clearAccountSession(storage: AccountSessionStorage): Promise<void> {
  if (storage.removeItem) await storage.removeItem(ORGANIZER_ACCOUNT_SESSION_KEY);
  else await storage.setItem(ORGANIZER_ACCOUNT_SESSION_KEY, "");
}
