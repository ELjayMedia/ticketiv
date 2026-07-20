# Ticketiv release readiness

This is the authoritative release gate for Ticketiv. Merchant and cashier/POS interfaces are intentionally outside this release scope.

## Required automated gate

Every release candidate must pass:

```bash
pnpm install --frozen-lockfile
pnpm check:release
```

`check:release` runs lint, unit/regression tests, TypeScript, the demo-pattern guard and a production Next.js build. GitHub Actions runs the same command for pull requests and `main`.

## Web platform

Release only when all items are evidenced against the deployment commit:

- Public discovery, event detail, guest checkout and authenticated checkout pass on mobile and desktop.
- Organizer onboarding lands in event creation and the full event wizard persists after refresh.
- Promo validation, inventory holds, expiration and last-ticket concurrency pass.
- Paystack and MoMo success, failure, retry and duplicate-callback paths reconcile exactly once.
- Orders, payment attempts, payments, ledger entries and minted tickets reconcile for every money-path fixture.
- Refund, transfer, guest claim, waitlist and resale failure recovery pass.
- Cross-organization reads and writes are denied.
- Public privacy, terms, support, refund and data-deletion routes return 200 while logged out.

## Ticketiv Access

The web scanner remains the fallback until the native release meets every gate below:

- Installable signed Android build exists.
- Huawei/no-GMS build installs and operates without Google services.
- Native camera permission, denial and recovery paths work.
- Pairing state and credentials use native secure storage.
- Manifest download, local validation, duplicate protection and queued sync work after process restart.
- Two offline devices scanning the same ticket produce a visible conflict during reconciliation.
- Remote session termination and stale-manifest policy are documented and tested.
- A real gate-volume test confirms acceptable scan latency.

## Ticketiv consumer app

The mobile package is not store-ready until:

- A native React Native shell and navigation are present.
- Signed Android and Huawei builds install on physical devices.
- Authentication persists securely across restarts.
- Hosted checkout opens in a secure browser/custom tab and returns through verified deep links.
- Successful payment refreshes the offline ticket wallet automatically.
- Ticket QR display works offline after a restart.
- Production app links, upgrade behavior and account deletion pass store UAT.

## Operations

Before public launch:

- Production, preview and staging environment values are separated.
- `NEXT_PUBLIC_APP_URL` is `https://ticketiv.app` in production.
- Paystack webhook targets the production webhook route and duplicate delivery has been tested.
- Sentry server and browser DSNs are configured and a test exception is visible.
- `support@ticketiv.app` and `privacy@ticketiv.app` receive monitored mail.
- `ticketiv.app` is verified for transactional email and `RESEND_FROM` is configured.
- Rollback instructions and the last known-good deployment are recorded.
- Database migration state matches the repository.

## Release evidence

For each release candidate, record:

- commit SHA and deployment URL
- automated gate result
- tester, date, device and browser
- UAT pass/fail evidence
- payment reconciliation evidence
- scanner offline/two-device evidence
- signed build identifiers for consumer and Access apps
- accepted risks and named owner

A release is not considered ready because code exists. It is ready only when these gates have current evidence for the exact commit being promoted.
