/**
 * Follower counts are shown publicly only once they reach this number, so a
 * new organiser, artist or venue isn't shown with "3 followers" (TICK-434).
 * Mirrors app.public_follower_threshold() in the database.
 */
export const PUBLIC_FOLLOWER_THRESHOLD = 50

export function publicFollowerCount(count: number | null | undefined): number | null {
  if (typeof count !== "number" || !Number.isFinite(count)) return null
  return count >= PUBLIC_FOLLOWER_THRESHOLD ? count : null
}
