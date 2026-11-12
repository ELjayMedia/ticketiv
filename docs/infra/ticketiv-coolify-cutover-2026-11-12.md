# Ticketiv Coolify production cutover

Status captured on 12 November 2026 (Africa/Mbabane). This runbook is a change
plan only. It does not authorize the public DNS change.

## Current routing

| Host | Current target | Observed result |
| --- | --- | --- |
| `ticketiv.app` | Vercel (`216.198.79.1`) | HTTP 402 `DEPLOYMENT_DISABLED` |
| `www.ticketiv.app` | `cname.vercel-dns-0.com` | HTTP 402 `DEPLOYMENT_DISABLED` |
| `uat.ticketiv.app` | Cloudflare Tunnel | Cloudflare Access challenge, then Coolify |

The UAT tunnel routes through `coolify-proxy:80` with an origin Host header of
`ticketiv.app`. It does not name a deployment container, so a normal Coolify
container replacement does not break UAT. The Cloudflare Access application is
scoped to `uat.ticketiv.app`; it must not be expanded to the apex or `www`.

Vercel is not a functional rollback target while it returns 402. Application
rollback therefore stays inside Coolify and uses a retained known-good image.

## Approval prerequisites

- The current main SHA is healthy in Docker and Coolify and `/api/health`
  reports the exact SHA.
- Authenticated owner UAT passes login, session persistence, logout to
  `/login`, session invalidation, re-login, organizer authorization and masked
  payout-account display.
- The existing payout accounts remain `enc:v2`, use key ID `2026-11-11a` and
  decrypt successfully.
- Financial counts and fingerprints remain unchanged, with no new audit writes
  caused by deployment verification.
- The production recovery archive and Storage archive checksums pass and the
  recovery key remains separately available.
- `CRON_SECRET`, Sentry DSNs and source-map build configuration are present in
  Coolify without secret values appearing in logs.
- The authorized Paystack production key is installed, live-mode opt-in is
  explicit, and the callback/webhook configuration is verified. See issue
  `#544`.
- Real payout execution remains disabled.

## Approved cutover changes

Use the existing Tunnel target
`5275c2c0-c84e-4a24-ba0b-b6af70d7a58e.cfargotunnel.com`.

1. Add exact Tunnel ingress rules for `ticketiv.app` and `www.ticketiv.app`
   before the terminal 404 rule. Both must use `http://coolify-proxy:80` and an
   origin Host header of `ticketiv.app`. Do not attach Cloudflare Access.
2. Replace apex DNS record `25c29ef5bf41d755374e4b67a1a0775e`
   (`A 216.198.79.1`, DNS-only) with a proxied CNAME to the Tunnel target.
3. Replace `www` DNS record `3e1dea97da1b2bfeff20bde67671a036`
   (`CNAME cname.vercel-dns-0.com`, DNS-only) with a proxied CNAME to the same
   Tunnel target.
4. Keep TTL on Auto. Do not alter `uat.ticketiv.app`, mail records, nameservers
   or unrelated zones.

Cloudflare terminates public TLS at the edge and carries traffic to Coolify over
the outbound Tunnel. The local Traefik default certificate is therefore not a
public certificate dependency for this routing design.

## Verification sequence

1. Confirm apex and `www` resolve through Cloudflare and present a trusted
   certificate.
2. Confirm `/api/health` is HTTP 200, `ok` is `true`, and `revision` equals the
   approved GitHub SHA.
3. Confirm `/`, `/search`, `/login`, discovery APIs and static assets return
   expected responses.
4. Complete the authenticated organizer checklist, including logout and
   cross-organization denial.
5. Confirm unsigned Paystack webhook requests remain HTTP 401 and verify one
   provider-signed, non-charging callback delivery.
6. Confirm scheduled jobs stop returning 402 and begin returning successful
   authenticated results.
7. Re-run payout decryption and financial fingerprint checks.
8. Monitor application, proxy, Cloudflare and Sentry errors continuously during
   the stabilization window.

## Rollback and stop conditions

Rollback immediately for any of the following:

- health is non-200 or reports the wrong SHA;
- login, logout, organizer authorization or Storage access fails;
- a signed payment callback fails or duplicate processing is observed;
- payout decryption fails or a financial fingerprint changes unexpectedly;
- sustained server errors, resource exhaustion or Tunnel instability occurs.

Preferred rollback: use Coolify deployment history to redeploy the retained
known-good image for `d48ad6346ba03488f4e026a5f3d8a977063005cb` (or, if required,
`bed57bd530eeeb373d37160566ba3195ec1ab16c`) while leaving Tunnel DNS in place.
Verify health and the reported revision again. Reverting DNS to the recorded
Vercel values is an emergency routing reversal only and does not restore service
while Vercel continues returning 402.

Do not decommission Vercel, delete retained images, enable payouts or remove the
verified recovery point during stabilization.
