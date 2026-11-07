# Security remediation — 7 November 2026

## Emergency containment

The legacy notification bridge (`POST /api/notifications/send` and the Supabase
`send-notification` Edge Function) accepted an arbitrary recipient and message.
The API forwarded requests to the Edge Function using a publishable/anon token;
the Edge Function then broadcast with service-role credentials. Possession of an
anon token did not authorize the sender to message the selected recipient.

- The Next.js endpoint now returns `410 Gone` without forwarding a request.
- The Edge Function now returns `410 Gone` without reading service-role secrets
  or broadcasting. It remains configured with `verify_jwt: true`.
- **Production:** Edge Function version 25 was deployed and read back on
  7 November 2026. The corresponding Next.js change requires a merge and
  deployment of this PR before its production route is retired as well.
- No callers of either endpoint were found in this repository. Any external
  integration that calls the retired endpoint will no longer send messages;
  replace it with a server-owned, authenticated, recipient-authorized workflow.

## Server identity verification

Routes, organizer pages, administrative layouts and an attendee-email server
action now derive identity from `supabase.auth.getUser()` (or the existing
`getAuthUser()` helper), rather than trusting `getSession()`'s cookie-backed
user object. Client-only `getSession()` reads used to render local UI state are
unchanged.

Regression test `tests/api-auth-boundary.test.ts` scans server-side `app/`
source for accidental reintroduction of the unsafe pattern and checks both
retired endpoints' source/response contract.

## Verification

- TypeScript: `tsc --noEmit` — passed.
- Vitest: 180 test files, 1067 passing, 7 skipped (after rebasing on PR #518).
- ESLint: no errors, 5 warnings unrelated to the changed security behavior.
- `git diff --check` — passed.
- Cross-org harness now exits `2` if credentials or a safe SQL execution
  capability are unavailable; unavailable is never reported as a pass.

## Follow-up before security sign-off

1. Merge/deploy this PR. Confirm the Next.js route returns `410` in production.
2. Run an authenticated negative test against the Edge Function using a
   throwaway account and a non-sensitive recipient: response should be `410`,
   and no realtime broadcast should arrive.
3. Reconcile Supabase migration-history drift before altering production
   database functions, RLS policies or storage bucket metadata.
4. Add strict provider confirmation and amount/currency checks to the deployed
   `resale-payment-success` and `waitlist-payment-success` callback handlers.
5. Assess promo-code RPC enumeration throttling, legacy public-profile privacy
   semantics, avatar MIME/size limits, and claimed-account guards on contact
   matching. Review current callers and product requirements before changing
   public interfaces.
6. Provision an isolated cross-organization authorization test environment and
   invoke the now-fail-closed harness in CI. Complete the pending human
   threat-model/secret sign-off.

These follow-ups are **not** represented as fixed by this PR.
