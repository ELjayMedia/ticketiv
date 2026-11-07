import { TICKETIV_PUBLIC_ORIGIN } from "./discovery";

/**
 * Event memory actions from the app. The ticket's delivery link identifies
 * the holder (the app has no login), so both calls go to token-scoped
 * endpoints that apply the same rules as the website.
 */

export type TicketivMemoryResult = { ok: true; following?: boolean } | { ok: false; message: string };

async function post(
  path: string,
  body: Record<string, unknown>,
  fetcher: typeof fetch,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await fetcher(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, json };
}

function failure(status: number, json: Record<string, unknown>): TicketivMemoryResult {
  if (status === 410) return { ok: false, message: "This ticket link has expired. Open your ticket from the latest email." };
  if (status === 429) return { ok: false, message: "Too many tries. Wait a minute and try again." };
  const error = typeof json.error === "string" ? json.error : "";
  // Our endpoints return plain sentences for rule failures (400).
  if (status === 400 && error) return { ok: false, message: error };
  return { ok: false, message: "That didn't save. Check your connection and try again." };
}

export async function submitTicketivFeedback(
  token: string,
  rating: number,
  comment: string,
  fetcher: typeof fetch = fetch,
  origin = TICKETIV_PUBLIC_ORIGIN,
): Promise<TicketivMemoryResult> {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "Choose 1 to 5 stars." };
  try {
    const { status, json } = await post(`${origin}/api/mobile/tickets/${encodeURIComponent(token)}/feedback`, { rating, comment: comment.trim() }, fetcher);
    return status >= 200 && status < 300 ? { ok: true } : failure(status, json);
  } catch {
    return { ok: false, message: "You're offline. Try again when you have signal." };
  }
}

export async function setTicketivOrgFollow(
  token: string,
  follow: boolean,
  fetcher: typeof fetch = fetch,
  origin = TICKETIV_PUBLIC_ORIGIN,
): Promise<TicketivMemoryResult> {
  try {
    const { status, json } = await post(`${origin}/api/mobile/tickets/${encodeURIComponent(token)}/follow`, { follow }, fetcher);
    return status >= 200 && status < 300 ? { ok: true, following: json.following === true } : failure(status, json);
  } catch {
    return { ok: false, message: "You're offline. Try again when you have signal." };
  }
}
