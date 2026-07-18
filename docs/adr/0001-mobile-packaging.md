# ADR 0001 — Mobile packaging: React Native two-app monorepo

- **Status**: Accepted (2026-07-17)
- **Jira**: TICK-313 (decision) · TICK-312 (epic) · TICK-328 (scaffold)

## Context

Ticketiv must ship to Google Play, the Apple App Store and Huawei AppGallery
(TICK-312). The platform already serves three materially different workflows:
attendees discover and buy tickets, organizers manage events and finances, and
staff pair devices and scan tickets — often offline. The existing product is a
Next.js 16 App Router web app on Vercel with a Supabase backend.

## Decision

**Two mobile apps, one web back office, one shared mobile codebase.**

| Product | Audience | Distribution | Identifier |
| --- | --- | --- | --- |
| **Ticketiv** | Attendees and ticket buyers | Google Play, App Store, AppGallery | `com.ticketiv.app` |
| **Ticketiv Access** | Event staff, scanners, outlet operators | All three stores, Android prioritised | `com.ticketiv.access` |
| **Ticketiv Organizer** | Organizers and admins | Existing responsive web/PWA | web domain |

Both mobile apps are **React Native**, developed in this repo as a pnpm
workspace sharing TypeScript models, API clients, validation, auth logic and
Quiet UI design tokens with the web app:

```
apps/ticketiv       RN consumer app (com.ticketiv.app)
apps/access         RN staff app (com.ticketiv.access)
packages/shared     platform-neutral models, formatting, validation, API logic
packages/tokens     Quiet UI design tokens as TS constants
(web app currently lives at the repo root; migrating it to apps/web is a
 later, separately-coordinated step because Vercel builds from the root)
```

### Android product flavours

```
playRelease    → ticketiv-play-release.aab    (FCM, Google Wallet)
huaweiRelease  → ticketiv-huawei-release.aab  (HMS Push, no GMS)
```

The core application is identical across flavours; only service integrations
differ. **Nothing may depend unconditionally on Google Play Services** — the
Huawei build must install and run on devices without GMS.

## Rejected alternatives

- **Flutter** — less reuse from the existing TypeScript/Supabase ecosystem.
- **WebView / thin Capacitor shell** — fails Apple's minimum-functionality bar
  (App Review Guidelines: apps must offer functionality beyond a repackaged
  website) and provides no offline/secure-storage story for tickets.
- **One oversized app** — scanning inside the consumer app couples gate
  operations to consumer release risk, bloats permissions and complicates
  review. A scanner outage must never require shipping a new shopping app.
- **Per-event white-label apps** — Apple discourages multiple bundle IDs for
  essentially the same app. Organizer branding is delivered dynamically via
  feature flags, themes, event landing pages and deep links.

## Store-compliance constraints

- Event tickets are real-world services → external processors (Paystack,
  DeltaPay, Flutterwave, mobile money) are permitted on every store
  (Apple guideline 3.1.5(a); Google Play explicitly excludes live-event
  tickets from Play Billing).
- Paid **digital** goods consumed in-app (voting credits, premium features,
  digital-only coupons) would trigger Apple/Google in-app billing. Do not add
  them to the ticket checkout without a deliberate compliance design.
- Apple 5.1.1(v) and Play policy require in-app account deletion (TICK-320).

## Rollout order

Eswatini mobile usage is roughly 84% Android / 16% iOS, so:

1. Ticketiv on Google Play
2. Ticketiv Access on Google Play
3. Ticketiv on the Apple App Store
4. Ticketiv + Access on Huawei AppGallery
5. Ticketiv Access on Apple, after iPhone gate-scanning is validated live

## Consequences

- The repo becomes a pnpm workspace. Shared code is extracted incrementally
  into `packages/shared` (starting with the platform-neutral formatting
  helpers); the web app consumes it via `workspace:*` + `transpilePackages`.
- CI grows Android (two flavours) and iOS build targets over time.
- The web app's move to `apps/web` is deferred until Vercel's root-directory
  setting can be changed in the same window (avoids breaking deploys).
