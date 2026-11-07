import { describe, expect, it, vi } from "vitest";

import { setTicketivOrgFollow, submitTicketivFeedback } from "./ticket-memory";

function fakeFetch(status: number, body: Record<string, unknown>) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
}

describe("ticket memory actions", () => {
  it("posts a rating to the token-scoped endpoint", async () => {
    const fetcher = fakeFetch(200, { ok: true });
    await expect(submitTicketivFeedback("tok/1", 4, "  Great  ", fetcher, "https://x.test")).resolves.toEqual({ ok: true });
    const [url, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://x.test/api/mobile/tickets/tok%2F1/feedback");
    expect(JSON.parse(init.body)).toEqual({ rating: 4, comment: "Great" });
  });

  it("explains rule failures and expiry in plain words", async () => {
    await expect(submitTicketivFeedback("t", 5, "", fakeFetch(400, { error: "You can rate the event once it has started" }))).resolves.toEqual({
      ok: false,
      message: "You can rate the event once it has started",
    });
    await expect(setTicketivOrgFollow("t", true, fakeFetch(410, {}))).resolves.toMatchObject({ ok: false, message: expect.stringContaining("expired") });
    await expect(submitTicketivFeedback("t", 9, "")).resolves.toEqual({ ok: false, message: "Choose 1 to 5 stars." });
  });

  it("reports offline without throwing", async () => {
    const offline = vi.fn(async () => {
      throw new TypeError("Network request failed");
    }) as unknown as typeof fetch;
    await expect(setTicketivOrgFollow("t", false, offline)).resolves.toMatchObject({ ok: false });
  });

  it("returns the follow state the server saved", async () => {
    await expect(setTicketivOrgFollow("t", true, fakeFetch(200, { ok: true, following: true }))).resolves.toEqual({ ok: true, following: true });
  });
});
