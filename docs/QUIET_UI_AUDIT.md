# Quiet UI Compliance Audit

Snapshot of every page under `app/**/page.tsx` and its relationship to the Quiet UI system at `components/quiet/`.

- **Total pages:** 83
- **Quiet UI compliant:** 23 (27.7%)
- **Legacy / not migrated:** 60
- **Mixed compliance:** 0 (no partial migrations — pages are either fully Quiet or fully legacy)
- **Empty / placeholder links found:** 0
- **Missing pages referenced:** 3

## Quiet UI Compliance Matrix

| Route | Route Group | Quiet Component(s) | Status |
|-------|-------------|--------------------|--------|
| `/` | (consumer) | `DesktopDiscover`, `MobileDiscover` | ✓ Quiet |
| `/calendar` | (consumer) | `CalendarScreen` | ✓ Quiet |
| `/friends` | (consumer) | `FriendsScreen` | ✓ Quiet |
| `/me` | (consumer) | `ProfileScreen` | ✓ Quiet |
| `/tickets` | (consumer) | `MyTickets` | ✓ Quiet |
| `/events/[id]` | (focused) | `DesktopEvent`, `MobileEvent` | ✓ Quiet |
| `/events/[id]/checkout` | (focused) | `DesktopCheckout`, `MobileCheckout` | ✓ Quiet |
| `/events/[id]/seating` | (focused) | `SeatingChart` | ✓ Quiet |
| `/orders/[orderId]/confirmation` | (focused) | `OrderConfirmation` | ✓ Quiet |
| `/orders/[orderId]/refund` | (focused) | `Refund` | ✓ Quiet |
| `/tickets/[id]` | (focused) | `TicketView` | ✓ Quiet |
| `/tickets/[id]/resale` | (focused) | `Resale` | ✓ Quiet |
| `/tickets/[id]/transfer` | (focused) | `Transfer` | ✓ Quiet |
| `/search` | (public) | `SearchResults` | ✓ Quiet |
| `/orgs/[orgId]/payouts` | orgs | `PayoutsLedger` | ✓ Quiet |
| `/orgs/[orgId]/team` | orgs | `TeamRoles` | ✓ Quiet |
| `/orgs/[orgId]/events/[eventId]/pos` | orgs | `BoxOffice` | ✓ Quiet |
| `/super-admin/db` | super-admin | `DBScreen` | ✓ Quiet |
| `/super-admin/flags` | super-admin | `FeatureFlagsScreen` | ✓ Quiet |
| `/super-admin/jobs` | super-admin | `JobsScreen` | ✓ Quiet |
| `/super-admin/routing` | super-admin | `RoutingScreen` | ✓ Quiet |
| `/super-admin/webhooks` | super-admin | `WebhooksScreen` | ✓ Quiet |
| `/dev/preview` | dev | `PreviewShells` | ✓ Quiet |
| `/login` | (auth) | — | ✗ Legacy |
| `/sign-in` | (auth) | — | ✗ Legacy |
| `/signup` | (auth) | — | ✗ Legacy |
| `/verify` | (auth) | — | ✗ Legacy |
| `/verify-email` | (auth) | — | ✗ Legacy |
| `/reset-password` | (auth) | — | ✗ Legacy |
| `/forgot-password` | (auth) | — | ✗ Legacy |
| `/payments` | (app) | — | ✗ Legacy |
| `/profile` | (app) | — | ✗ Legacy |
| `/dashboard` | (organizer) | — | ✗ Legacy (redirect) |
| `/devices` | (organizer) | — | ✗ Legacy (redirect) |
| `/finance` | (organizer) | — | ✗ Legacy (redirect) |
| `/payouts` | (organizer) | — | ✗ Legacy (redirect) |
| `/orgs/[orgId]/dashboard` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/checkin` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/edit` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/guestlist` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/operations` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/orders` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/scanner` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/scans` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/staff` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/[eventId]/tickets` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/events/new` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/feature-flags` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/pricing-plans` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/series` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/series/new` | orgs | — | ✗ Legacy |
| `/orgs/[orgId]/series/[seriesSlug]` | orgs | — | ✗ Legacy |
| `/artists/[id]` | (public) | — | ✗ Legacy |
| `/category/[slug]` | (public) | — | ✗ Legacy |
| `/create` | (public) | — | ✗ Legacy |
| `/events/new` | (public) | — | ✗ Legacy |
| `/host` | (public) | — | ✗ Legacy |
| `/marketplace` | (public) | — | ✗ Legacy |
| `/organisers` | (public) | — | ✗ Legacy |
| `/organisers/[id]` | (public) | — | ✗ Legacy |
| `/series/[slug]` | (public) | — | ✗ Legacy |
| `/venues` | (public) | — | ✗ Legacy |
| `/scan` | (scanner) | — | ✗ Legacy |
| `/scan/setup` | (scanner) | — | ✗ Legacy |
| `/scan/history` | (scanner) | — | ✗ Legacy |
| `/scan/sync` | (scanner) | — | ✗ Legacy |
| `/events/create` | (events-create) | — | ✗ Legacy |
| `/403` | utility | — | ✗ Legacy |
| `/maintenance` | utility | — | ✗ Legacy |
| `/onboarding` | onboarding | — | ✗ Legacy |
| `/onboarding/organizer` | onboarding | — | ✗ Legacy |
| `/ping` | system | — | ○ Minimal |
| `/super-admin` | super-admin | — | ✗ Legacy |
| `/super-admin/audit` | super-admin | — | ✗ Legacy |
| `/super-admin/env-vars` | super-admin | — | ✗ Legacy |
| `/super-admin/event-categories` | super-admin | — | ✗ Legacy |
| `/super-admin/login` | super-admin | — | ✗ Legacy |
| `/super-admin/readiness` | super-admin | — | ✗ Legacy |
| `/super-admin/workspaces/[workspace]` | super-admin | — | ✗ Legacy |
| `/super-admin/[resource]` | super-admin | — | ✗ Legacy |
| `/super-admin/[resource]/[id]` | super-admin | — | ✗ Legacy |

## Migration Priority

### Tier 1 — High-traffic user surfaces (12 pages)
Highest priority. Touches every external buyer or on-the-ground staffer.

| Page | Effort | Notes |
|------|--------|-------|
| `(scanner)/scan` | L | Core checkin loop — needs custom Quiet screen (none exists) |
| `(scanner)/scan/setup` | M | Form-heavy; reuse Quiet form primitives |
| `(scanner)/scan/history` | M | List view; pattern after `MyTickets` |
| `(scanner)/scan/sync` | M | Status screen |
| `(public)/artists/[id]` | M | Detail page; pattern after `MobileEvent` |
| `(public)/venues` | M | List page; pattern after `DesktopDiscover` |
| `(public)/organisers` + `[id]` | M | List + detail; reuse discover patterns |
| `(public)/series/[slug]` | M | Detail page |
| `(public)/category/[slug]` | M | Filtered discover |
| `(public)/marketplace` | M | Discover variant |
| `(public)/host` + `(public)/create` | M | Marketing landing |
| `(auth)/forgot-password` | S | Form |

### Tier 2 — Operator surfaces (~22 pages)
Daily-driver organizer screens. No Quiet screens exist for most; will need new compositions.

| Page | Effort |
|------|--------|
| `orgs/[orgId]/dashboard` | L |
| `orgs/[orgId]/events` (list) | L |
| `orgs/[orgId]/events/[eventId]` (detail) | L |
| `orgs/[orgId]/events/[eventId]/edit` | L |
| `orgs/[orgId]/events/[eventId]/checkin` | L |
| `orgs/[orgId]/events/[eventId]/orders` | L |
| `orgs/[orgId]/events/[eventId]/guestlist` | L |
| `orgs/[orgId]/events/[eventId]/operations` | L |
| `orgs/[orgId]/events/[eventId]/scanner` | L |
| `orgs/[orgId]/events/[eventId]/scans` | L |
| `orgs/[orgId]/events/[eventId]/staff` | L |
| `orgs/[orgId]/events/[eventId]/tickets` | L |
| `orgs/[orgId]/events/new` | L |
| `orgs/[orgId]/series` + `new` + `[slug]` | M (×3) |
| `orgs/[orgId]/feature-flags` | M |
| `orgs/[orgId]/pricing-plans` | M |
| `(events-create)/events/create` | L (wizard) |
| `(organizer)/dashboard|devices|finance|payouts` | S (×4 — redirects) |

### Tier 3 — Internal tooling (7 pages)
Low UX risk; replicate existing Quiet admin screens (db, flags, jobs, routing, webhooks).

| Page | Effort |
|------|--------|
| `super-admin` (index) | S |
| `super-admin/audit` | M |
| `super-admin/env-vars` | M |
| `super-admin/event-categories` | M |
| `super-admin/readiness` | S |
| `super-admin/workspaces/[workspace]` | M |
| `super-admin/[resource]` + `[id]` | M (×2 — generic) |

### Tier 4 — Auth + utility (10 pages)
Quick wins. Self-contained, small, and align well with Quiet form/card primitives.

| Page | Effort |
|------|--------|
| `(auth)/login` | S |
| `(auth)/sign-in` | S |
| `(auth)/signup` | S |
| `(auth)/verify` | S |
| `(auth)/verify-email` | S |
| `(auth)/reset-password` | S |
| `onboarding` | M |
| `onboarding/organizer` | M |
| `403` | S |
| `maintenance` | S |
| `(app)/profile` + `(app)/payments` | S (×2) |
| `super-admin/login` | S |

## Empty / Placeholder Links

**None found.** Every `href`, `router.push()`, and `redirect()` call in the codebase points to a real route or a documented external URL. No `href="#"`, `href=""`, `href="/TODO"`, or naked `<Link>` elements were detected.

## Missing Pages

Routes referenced from Quiet shells/screens that have no matching `app/**/page.tsx`:

| Referenced route | Referenced from | Notes |
|------------------|-----------------|-------|
| `/notifications` | `components/quiet/shell/mobile-shell.tsx:133` | Bell icon target in mobile shell. No page implemented. |
| `/series` | `components/quiet/shell/desktop-nav.tsx:13` | Desktop nav link. No top-level page; closest is `/orgs/[orgId]/series`. |
| `/organizers` | `components/quiet/shell/desktop-nav.tsx:15` | Desktop nav link. Closest is `(public)/organisers/page.tsx` — note spelling difference (`-z-` vs `-s-`). |

Recommended fixes:
- Add `app/(consumer)/notifications/page.tsx` (or remove the bell from `mobile-shell.tsx` until built).
- Alias `/series` → `(public)` browse page, or remove from desktop-nav.
- Fix spelling: change desktop-nav `/organizers` → `/organisers`, or rename the public route.

## Available Quiet Screens (reuse reference)

```
components/quiet/screens/
├── admin/
│   ├── db.tsx
│   ├── feature-flags.tsx
│   ├── jobs.tsx
│   ├── routing.tsx
│   └── webhooks.tsx
├── calendar/
│   └── calendar-screen.tsx
├── checkout/
│   ├── desktop-checkout.tsx
│   └── mobile-checkout.tsx
├── confirmation/
│   └── order-confirmation.tsx
├── discover/
│   ├── desktop-discover.tsx
│   └── mobile-discover.tsx
├── event-detail/
│   ├── desktop-event.tsx
│   └── mobile-event.tsx
├── friends/
│   └── friends-screen.tsx
├── payouts/
│   └── payouts-ledger.tsx
├── pos/
│   └── box-office.tsx
├── profile/
│   └── profile-screen.tsx
├── search/
│   └── search-results.tsx
├── seating/
│   └── seating-chart.tsx
├── team/
│   └── team-roles.tsx
└── tickets/
    ├── my-tickets.tsx
    ├── refund.tsx
    ├── resale.tsx
    ├── ticket-view.tsx
    └── transfer.tsx
```

Shell primitives at `components/quiet/shell/`: `desktop-nav.tsx`, `mobile-shell.tsx`, `preview-shells.tsx`.
UI primitives at `components/quiet/ui/`: `button.tsx`, `card.tsx`, `chip.tsx`, `form.tsx`, `icon.tsx`, `primitives.tsx`.
