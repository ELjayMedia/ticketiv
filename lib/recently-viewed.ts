/**
 * Recently-viewed events — a localStorage-backed, auth-free personalisation
 * store. Keeps a small, most-recent-first, de-duplicated list of compact event
 * snapshots so the discovery home can surface "Recently viewed" without any DB
 * round-trip (TICK-212).
 *
 * All access is SSR-safe: callers must invoke these only from the browser
 * (inside `useEffect` / event handlers). Each entry carries a `viewedAt`
 * timestamp; entries older than `MAX_AGE_MS` (30 days) are pruned on read.
 */

const STORAGE_KEY = "ticketiv:recently-viewed:v1";
const MAX_ENTRIES = 8;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface RecentlyViewedEvent {
  /** Stable identifier — the event slug, used for the link + de-duplication. */
  slug: string;
  title: string;
  /** Poster URL; may be empty when the event has no image. */
  photo: string;
  /** Short, pre-formatted date label (e.g. "Sat 26 Aug"). */
  dateShort: string;
  /** Pre-formatted price label (e.g. "From E450") or null. */
  priceLabel: string | null;
  /** Epoch ms when the event was viewed; drives ordering + expiry. */
  viewedAt: number;
}

function hasWindow(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isFresh(entry: RecentlyViewedEvent, now: number): boolean {
  return typeof entry.viewedAt === "number" && now - entry.viewedAt <= MAX_AGE_MS;
}

/**
 * Read the current list, most-recent-first, with expired entries pruned.
 * Returns `[]` on the server or when storage is empty/corrupt.
 */
export function getRecentlyViewed(): RecentlyViewedEvent[] {
  if (!hasWindow()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed
      .filter(
        (e): e is RecentlyViewedEvent =>
          !!e &&
          typeof e === "object" &&
          typeof (e as RecentlyViewedEvent).slug === "string" &&
          typeof (e as RecentlyViewedEvent).title === "string",
      )
      .filter((e) => isFresh(e, now))
      .sort((a, b) => b.viewedAt - a.viewedAt)
      .slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/**
 * Record (or bump) an event view. De-duplicates by slug, prepends the fresh
 * entry, prunes expired entries, and caps the list at `MAX_ENTRIES`.
 * No-op on the server.
 */
export function recordRecentlyViewed(
  entry: Omit<RecentlyViewedEvent, "viewedAt">,
): void {
  if (!hasWindow()) return;
  if (!entry.slug) return;
  try {
    const now = Date.now();
    const existing = getRecentlyViewed().filter((e) => e.slug !== entry.slug);
    const next: RecentlyViewedEvent[] = [
      { ...entry, viewedAt: now },
      ...existing,
    ].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full / disabled / private mode — fail silently.
  }
}
