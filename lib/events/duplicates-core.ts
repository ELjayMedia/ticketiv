/**
 * Duplicate-event guard: shared types and copy. The matching itself runs in
 * Postgres (app.event_duplicate_matches); this turns its rows into words.
 * Pure, so the form, the admin console and tests can all use it.
 */

export type DuplicateRequestStatus = "with_support" | "with_organiser" | "approved" | "declined" | "withdrawn"
export type DuplicateRequestReason = "permission" | "mine_is_original" | "different_event" | "other"

export interface DuplicateMatch {
  eventId: string
  title: string
  slug: string | null
  startsAt: string | null
  tz: string | null
  venueName: string | null
  orgName: string
  sameVenue: boolean
  titleSimilarity: number
  sharedArtists: number
  /** Enough signals that publishing is refused until a request is approved. */
  blocking: boolean
  approved: boolean
  request: {
    id: string
    status: DuplicateRequestStatus
    createdAt: string
    forwardedAt: string | null
    forwardedBy: "support" | "auto" | null
    decisionNote: string | null
    decidedAt: string | null
  } | null
}

export const AUTO_FORWARD_HOURS = 3

export const DUPLICATE_REASONS: Array<{ value: DuplicateRequestReason; label: string; hint: string }> = [
  { value: "permission", label: "We're working with them", hint: "Co-hosting, a second sales partner, or selling with their permission." },
  { value: "mine_is_original", label: "This is our event", hint: "The other listing copies ours or isn't from the real organiser." },
  { value: "different_event", label: "It's a different event", hint: "Same night or place, but a separate show." },
  { value: "other", label: "Something else", hint: "Tell support what's going on." },
]

/** Why the two events look the same, in the organiser's words. */
export function duplicateReasons(match: Pick<DuplicateMatch, "sameVenue" | "titleSimilarity" | "sharedArtists">): string[] {
  const reasons: string[] = []
  if (match.titleSimilarity >= 0.7) reasons.push("almost the same name")
  else if (match.titleSimilarity >= 0.5) reasons.push("a similar name")
  if (match.sameVenue) reasons.push("the same venue")
  if (match.sharedArtists > 0) reasons.push(match.sharedArtists === 1 ? "an artist in common" : `${match.sharedArtists} artists in common`)
  return reasons
}

/** Matches that still stop publishing. */
export function unresolvedBlocking(matches: ReadonlyArray<DuplicateMatch>): DuplicateMatch[] {
  return matches.filter((m) => m.blocking && !m.approved)
}

/** When an untouched request goes to the original organiser on its own. */
export function autoForwardAt(createdAt: string): Date {
  return new Date(new Date(createdAt).getTime() + AUTO_FORWARD_HOURS * 60 * 60 * 1000)
}

/** "2 h 10 min" / "8 min" / "any moment now". */
export function timeLeftLabel(until: Date, now: Date): string {
  const minutes = Math.ceil((until.getTime() - now.getTime()) / 60000)
  if (minutes <= 0) return "any moment now"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} h${m > 0 ? ` ${m} min` : ""}` : `${m} min`
}

export function requestStatusLabel(status: DuplicateRequestStatus, originalOrgName: string): string {
  switch (status) {
    case "with_support":
      return "With Ticketiv support"
    case "with_organiser":
      return `Waiting for ${originalOrgName}`
    case "approved":
      return "Approved"
    case "declined":
      return "Declined"
    case "withdrawn":
      return "Withdrawn"
  }
}

/** Friendly text for the database guard's error, or null if it's another error. */
export function duplicateGuardMessage(error: { message?: string | null } | null | undefined): string | null {
  if (!error?.message?.includes("duplicate_event")) return null
  return "This event matches another organiser's published event, so it can't go live as it is. Open the event form to see the match and ask Ticketiv support for permission."
}
