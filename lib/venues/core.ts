// TICK-481 — Venue workspace rules shared by UI and server actions.
// The database (venue_members + SECURITY DEFINER RPCs) is the authority; these
// helpers only decide what to show, and mirror the RPC checks so the UI never
// offers an action the database will refuse.

export type VenueRole = "venue_owner" | "venue_manager" | "venue_staff"
export type VenueClaimStatus = "pending" | "approved" | "rejected" | "withdrawn"
export type VenueVerification = "unverified" | "verified"

export const VENUE_ROLES: readonly VenueRole[] = ["venue_owner", "venue_manager", "venue_staff"]

export function isVenueRole(value: unknown): value is VenueRole {
  return typeof value === "string" && (VENUE_ROLES as readonly string[]).includes(value)
}

export function venueRoleLabel(role: VenueRole): string {
  return role === "venue_owner" ? "Owner" : role === "venue_manager" ? "Manager" : "Staff"
}

/** Owners and managers edit the public profile; staff can only view. */
export function canEditVenueProfile(role: VenueRole | null): boolean {
  return role === "venue_owner" || role === "venue_manager"
}

/** Roles this person may add to the team (fn_add_venue_member). */
export function assignableVenueRoles(role: VenueRole | null): VenueRole[] {
  if (role === "venue_owner") return ["venue_manager", "venue_staff"]
  if (role === "venue_manager") return ["venue_staff"]
  return []
}

/** Mirrors fn_remove_venue_member: owners can't be removed; anyone may leave. */
export function canRemoveVenueMember(
  actorRole: VenueRole | null,
  targetRole: VenueRole,
  isSelf: boolean,
): boolean {
  if (targetRole === "venue_owner") return false
  if (isSelf) return true
  if (actorRole === "venue_owner") return true
  return actorRole === "venue_manager" && targetRole === "venue_staff"
}

export function claimStatusLabel(status: VenueClaimStatus): string {
  switch (status) {
    case "pending":
      return "Waiting for review"
    case "approved":
      return "Approved"
    case "rejected":
      return "Not approved"
    case "withdrawn":
      return "Withdrawn"
  }
}

export const VENUE_EVIDENCE_MIN = 20
export const VENUE_EVIDENCE_MAX = 2000

/** Plain-language copy for the error codes the venue RPCs raise. */
const VENUE_ERROR_COPY: Record<string, string> = {
  claimed_account_required: "Sign in with a full Ticketiv account (email or phone verified) to manage a venue.",
  name_required: "Enter the venue's name.",
  city_required: "Enter the town or city.",
  capacity_invalid: "Capacity must be a whole number between 1 and 200,000.",
  evidence_required: `Tell us how you're connected to the venue (at least ${VENUE_EVIDENCE_MIN} characters).`,
  venue_exists: "That venue is already on Ticketiv. Search for it and request access instead.",
  venue_not_found: "That venue no longer exists.",
  already_member: "That person is already on the team.",
  claim_pending: "You already have a request waiting for review for this venue.",
  claim_not_found: "That request can't be withdrawn any more.",
  role_invalid: "Choose a valid role.",
  website_invalid: "The website must start with http:// or https://.",
  email_invalid: "Enter a valid contact email.",
  owner_cannot_be_removed: "The owner can't be removed. Contact Ticketiv support to transfer ownership.",
  member_not_found: "That person is no longer on the team.",
  forbidden: "Your role can't do this.",
  venue_already_owned: "This venue already has a verified owner.",
  claim_not_pending: "Someone already reviewed this request.",
  claim_rate_limited: "You have several requests waiting. Wait for them to be reviewed before sending more.",
}

export function venueErrorMessage(error: { message?: string | null; code?: string | null } | null | undefined): string {
  const message = error?.message ?? ""
  const code = Object.keys(VENUE_ERROR_COPY).find((key) => message.includes(key))
  if (code) return VENUE_ERROR_COPY[code]
  if (error?.code === "42501") return VENUE_ERROR_COPY.forbidden
  return "Something went wrong. Please try again."
}

/** The venue id Postgres puts in DETAIL when fn_create_venue_profile hits an existing venue. */
export function existingVenueIdFromError(error: { message?: string | null; details?: string | null } | null | undefined): string | null {
  if (!error?.message?.includes("venue_exists")) return null
  const id = (error.details ?? "").trim()
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
