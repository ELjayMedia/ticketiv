import { describe, expect, it, vi } from "vitest";

import {
  AccountAuthError,
  ORGANIZER_ACCOUNT_SESSION_KEY,
  clearAccountSession,
  loadAccountSession,
  refreshAccountSession,
  saveAccountSession,
  sessionNeedsRefresh,
  signInWithPassword,
  signOutAccount,
  type OrganizerAccountSession,
} from "./account-session";

const NOW = 1_800_000_000_000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function config(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(fetchImpl);
  return {
    fetchMock,
    config: {
      supabaseUrl: "https://example.supabase.co/",
      publishableKey: "sb_publishable_test",
      fetch: fetchMock as unknown as typeof fetch,
      now: () => NOW,
    },
  };
}

const tokenBody = {
  access_token: "access-1",
  refresh_token: "refresh-1",
  expires_in: 3600,
  user: { id: "user-1", email: "door@example.com" },
};

describe("organizer account sign-in", () => {
  it("signs in with email and password against Supabase Auth", async () => {
    const { config: c, fetchMock } = config(async () => json(200, tokenBody));
    const session = await signInWithPassword(c, "  Door@Example.com ", "secret");

    expect(session).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresAt: NOW + 3_600_000,
      userId: "user-1",
      email: "door@example.com",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://example.supabase.co/auth/v1/token?grant_type=password");
    expect((init?.headers as Record<string, string>).apikey).toBe("sb_publishable_test");
    expect(JSON.parse(String(init?.body))).toEqual({ email: "door@example.com", password: "secret" });
  });

  it("explains wrong credentials, unconfirmed email, rate limits and network failures", async () => {
    const cases: Array<[() => Promise<Response>, string]> = [
      [async () => json(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" }), "invalid_credentials"],
      [async () => json(400, { error: "invalid_grant", error_description: "Invalid login credentials" }), "invalid_credentials"],
      [async () => json(400, { error_code: "email_not_confirmed", msg: "Email not confirmed" }), "email_not_confirmed"],
      [async () => json(429, { msg: "Too many requests" }), "rate_limited"],
      [async () => { throw new TypeError("Network request failed"); }, "network"],
    ];
    for (const [impl, kind] of cases) {
      const { config: c } = config(impl);
      await expect(signInWithPassword(c, "a@b.co", "x")).rejects.toMatchObject({ kind });
    }
  });

  it("does not call the server without an email and password", async () => {
    const { config: c, fetchMock } = config(async () => json(200, tokenBody));
    await expect(signInWithPassword(c, " ", "x")).rejects.toBeInstanceOf(AccountAuthError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refreshes before expiry and reports a revoked session as expired", async () => {
    const session: OrganizerAccountSession = { accessToken: "a", refreshToken: "r", expiresAt: NOW + 30_000, userId: "u", email: null };
    expect(sessionNeedsRefresh(session, NOW)).toBe(true);
    expect(sessionNeedsRefresh({ ...session, expiresAt: NOW + 10 * 60_000 }, NOW)).toBe(false);

    const ok = config(async () => json(200, { ...tokenBody, access_token: "access-2" }));
    await expect(refreshAccountSession(ok.config, session)).resolves.toMatchObject({ accessToken: "access-2" });
    expect(ok.fetchMock.mock.calls[0][0]).toContain("grant_type=refresh_token");

    const revoked = config(async () => json(400, { error_code: "refresh_token_not_found" }));
    await expect(refreshAccountSession(revoked.config, session)).rejects.toMatchObject({ kind: "session_expired" });
  });

  it("signs out without waiting on the network", async () => {
    const session: OrganizerAccountSession = { accessToken: "a", refreshToken: "r", expiresAt: NOW, userId: "u", email: null };
    const { config: c } = config(async () => { throw new TypeError("offline"); });
    await expect(signOutAccount(c, session)).resolves.toBeUndefined();
  });

  it("keeps the session in secure storage and treats corrupt entries as signed out", async () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => void store.set(k, v),
      removeItem: async (k: string) => void store.delete(k),
    };
    const session: OrganizerAccountSession = { accessToken: "a", refreshToken: "r", expiresAt: NOW, userId: "u", email: "x@y.z" };

    await saveAccountSession(storage, session);
    await expect(loadAccountSession(storage)).resolves.toEqual(session);

    store.set(ORGANIZER_ACCOUNT_SESSION_KEY, "{not json");
    await expect(loadAccountSession(storage)).resolves.toBeNull();

    await clearAccountSession(storage);
    expect(store.has(ORGANIZER_ACCOUNT_SESSION_KEY)).toBe(false);
  });
});
