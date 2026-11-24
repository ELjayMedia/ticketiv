# Artist and venue claims: operations runbook

The flows are TICK-481 (venues) and TICK-353 / TICK-484 (artists).

## Review a claim
1. Go to `/super-admin/venue-claims` or `/super-admin/artist-claims`.
2. Check the evidence against **independent** sources: the venue's public number, or the artist's official pages. Don't rely on the phone number the claimant supplied.
3. Approve, or reject with a note. The claimant is told the outcome.
4. A second owner claim is a **dispute**. Contact both people first. Use "Approve and replace owner" only with recorded evidence; the previous owner stays a manager.

## Roll back a claim approved in error
- **Artist:** use `/super-admin/artist-claims`, then "Roll back an approved claim" (`fn_admin_reset_artist_owner`). This removes the owner and all managers and makes the profile unverified again. Line-ups and followers are kept.
- **Venue:** approve the genuine owner's claim with "Approve and replace owner". To remove someone outright, use the venue team page as the owner, or ask engineering to run a scoped `delete from venue_members`. Every action is audited.

## Merge duplicate artist profiles
Use `/super-admin/artist-claims`, then "Merge a duplicate profile" (`fn_admin_merge_artists`). It moves line-ups, followers and managers to the canonical profile and fills empty bio and photo fields. The old ID and slug redirect through `artist_redirects`, so existing URLs keep working. It refuses the merge if both profiles have different owners; reset one first.

## Abuse controls
- Each person can have at most **3 pending** claims and submit **10 in 24 hours**, across venue and artist claims (`claim_rate_limited`).
- Claims need a full account; guest-checkout sessions are refused.
- Organisers can fill a missing bio or photo only on **unclaimed** artists. Claimed artists control their own identity fields.

## Audit trail
`audit_log` with `table_name` in (`venue_claims`, `artist_claims`, `venues`, `artists`, `venue_members`, `artist_members`); the `changes->>'event'` value names the action.
