// TICK-353 / TICK-484 — artist workspace rules shared by UI and actions.
// The database (artist_members + SECURITY DEFINER RPCs) is the authority.

export type ArtistRole = "artist_owner" | "artist_manager"
export type ArtistClaimStatus = "pending" | "approved" | "rejected" | "withdrawn"

export const ARTIST_LINK_KEYS = [
  ["website", "Website"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["x", "X"],
  ["youtube", "YouTube"],
  ["spotify", "Spotify"],
  ["apple_music", "Apple Music"],
  ["soundcloud", "SoundCloud"],
  ["audiomack", "Audiomack"],
  ["eljaytunes", "EljayTunes"],
] as const
export type ArtistLinkKey = (typeof ARTIST_LINK_KEYS)[number][0]

export const PERFORMER_TYPES = [
  ["solo", "Solo artist"],
  ["band", "Band"],
  ["group", "Group"],
  ["choir", "Choir"],
  ["dj", "DJ"],
  ["comedian", "Comedian"],
  ["other", "Other"],
] as const

export function isArtistRole(v: unknown): v is ArtistRole {
  return v === "artist_owner" || v === "artist_manager"
}

export function artistRoleLabel(role: ArtistRole): string {
  return role === "artist_owner" ? "Owner" : "Manager"
}

/** Mirrors fn_remove_artist_member: the owner can't be removed; managers may leave; only the owner removes others. */
export function canRemoveArtistMember(actor: ArtistRole | null, target: ArtistRole, isSelf: boolean): boolean {
  if (target === "artist_owner") return false
  if (isSelf) return true
  return actor === "artist_owner"
}

/** Up to 8 comma-separated genres, trimmed, lower-cased, de-duplicated (the RPC does the same). */
export function parseGenres(input: string): string[] {
  return [...new Set(input.split(",").map((g) => g.trim().toLowerCase()).filter((g) => g.length > 0 && g.length <= 40))].slice(0, 8)
}

/** Keep only known link keys with https URLs; empty values are dropped. */
export function cleanLinks(input: Partial<Record<string, string>>): Partial<Record<ArtistLinkKey, string>> {
  const out: Partial<Record<ArtistLinkKey, string>> = {}
  for (const [key] of ARTIST_LINK_KEYS) {
    const v = (input[key] ?? "").trim()
    if (v) out[key] = v
  }
  return out
}

export function claimStatusLabel(status: ArtistClaimStatus): string {
  return status === "pending" ? "Waiting for review" : status === "approved" ? "Approved" : status === "rejected" ? "Not approved" : "Withdrawn"
}

const ERROR_COPY: Record<string, string> = {
  claimed_account_required: "Sign in with a full Ticketiv account (email or phone verified) to manage an artist.",
  artist_exists: "That name is already on Ticketiv. Find the profile below and request access to it.",
  evidence_required: "Tell us how you're connected to the artist (at least 20 characters).",
  claim_pending: "You already have a request waiting for review for this artist.",
  already_member: "That person already manages this artist.",
  artist_not_found: "That artist no longer exists.",
  claim_not_found: "That request can't be withdrawn any more.",
  link_invalid: "Each link must be a full https:// address.",
  image_invalid: "The photo must be an https:// image address.",
  email_invalid: "Enter a valid booking email.",
  owner_cannot_be_removed: "The owner can't be removed. Contact Ticketiv support to transfer ownership.",
  member_not_found: "That person no longer manages this artist.",
  forbidden: "Your role can't do this.",
  artist_already_owned: "This artist already has a verified owner.",
  claim_not_pending: "Someone already reviewed this request.",
  claim_rate_limited: "You have several requests waiting. Wait for them to be reviewed before sending more.",
  merge_owner_conflict: "Both profiles have different owners. Reset one owner first.",
  merge_same_artist: "Choose two different artists.",
  note_required: "Add a note (at least 5 characters) for the audit log.",
}

export function artistErrorMessage(error: { message?: string | null; code?: string | null } | null | undefined): string {
  const message = error?.message ?? ""
  const key = Object.keys(ERROR_COPY).find((k) => message.includes(k))
  if (key) return ERROR_COPY[key]
  if (error?.code === "42501") return ERROR_COPY.forbidden
  if (error?.code === "23514") return "One of the fields isn't valid. Links, photos and press kits must be https:// addresses."
  return "Something went wrong. Please try again."
}
