# Journey Audit Report: Attendees & Organizers

## Executive Summary

The platform provides two distinct user journeys: **Attendees** (event discovery, ticketing, attendance) and **Organizers** (event creation, management, analytics). Both journeys have functional flows but contain critical optimization opportunities in navigation, onboarding, and feature discoverability.

---

## ATTENDEE JOURNEY AUDIT

### Current Flow
1. **Landing** → Home page (events list)
2. **Discovery** → Browse/Search events
3. **Event Details** → View event, ticket types, lineup
4. **Checkout** → Select quantity, enter contact, payment
5. **Post-Purchase** → Success page, ticket in inbox
6. **Management** → View tickets, transfer, revoke
7. **Attendance** → QR code presentation at venue

### Findings

#### ✅ Strengths
- Clean event discovery with browse page
- Multiple payment method options (DeltaPay, Card, Paystack, Flutterwave)
- Post-purchase success page with clear next steps
- My Tickets page with quick access from dropdown menu
- Real-time ticket status tracking (valid/checked-in)

#### ⚠️ Issues & Opportunities

1. **Missing Signup Friction on First Browse**
   - Users can browse events without creating account
   - No clear CTAs for non-logged-in users to purchase
   - Checkout page likely requires login redirect mid-flow
   - Recommendation: Add "Sign in to buy" prompt before checkout form

2. **Header Navigation Confusing for Non-Organizers**
   - Header shows "Create Events" link to all users
   - Should conditionally show "Create Events" only for organizers
   - Non-organizers clicking it will likely get redirected/403
   - Recommendation: Move "Create Events" to organizer-only navigation

3. **Limited Event Filtering/Sorting**
   - Browse page shows events list but no mention of filters
   - No sort options (price, date, popularity)
   - Category page exists but not prominently linked
   - Recommendation: Add faceted search (city, category, date range, price)

4. **Post-Purchase Experience Incomplete**
   - Success page shown but unclear if ticket is in email
   - No download option or QR code preview
   - App home links to browse/tickets but no recent activity
   - Recommendation: Show downloadable PDF ticket immediately after purchase

5. **Weak Ticket Management Features**
   - Transfer feature exists but requires manual link sharing
   - No ability to gift tickets within app
   - Revoke capability unclear to users
   - Recommendation: Add gift/share flows with email invitations

6. **Missing Social/Community Features**
   - No event recommendations based on interests
   - No ability to see "going" or friend activity
   - No wishlist/favorites system
   - Recommendation: Add favorites, friend activity, recommendations

### Priority Actions for Attendees
1. **HIGH**: Fix header navigation (hide "Create Events" from attendees)
2. **HIGH**: Add sign-in prompt before checkout for non-authenticated users
3. **MEDIUM**: Enhance event filtering/search UX
4. **MEDIUM**: Add immediate QR/PDF download after purchase
5. **LOW**: Add social/discovery features (wishlist, recommendations)

---

## ORGANIZER JOURNEY AUDIT

### Current Flow
1. **Signup** → Email/password registration
2. **Onboarding** → Create organization (missing?)
3. **Dashboard** → View KPIs, event overview, recent events
4. **Event Creation** → Event wizard (EventWizardClient) with details, tickets, settings
5. **Event Management** → Overview, check-in, tickets, staff, payouts, analytics
6. **Analytics** → KPI charts, revenue, check-in rates
7. **Check-in** → QR scanner with real-time updates
8. **Staff Management** → Assign roles, permissions

### Findings

#### ✅ Strengths
- Comprehensive dashboard with KPIs and charts (bar, line, attendance)
- Real-time check-in scanner with activity history
- Event management tabs with clear sections (overview, tickets, staff, payouts)
- Revenue tracking and attendance analytics
- Granular staff permissions (EVENT_SCAN, EVENT_MANAGE, etc.)
- Demo mode for testing without Supabase

#### ⚠️ Issues & Opportunities

1. **Vague Event Creation Flow**
   - "EventWizardClient" exists but structure unclear
   - No guidance on required vs optional fields
   - Unknown if multi-step process is mobile-friendly
   - Recommendation: Review/audit event creation UX; document required fields

2. **Missing Organization Onboarding**
   - No evidence of org creation flow after signup
   - Unclear where organizers create their org
   - Demo shows using demo-org-1 directly
   - Recommendation: Create org setup flow (name, logo, billing info)

3. **Analytics Not Linked to Events**
   - Dashboard shows KPI cards and charts
   - Unclear if charts are interactive (drill-down to event)
   - No time range filtering visible
   - Recommendation: Add time range selector, event detail drill-down

4. **Staff Management Disconnected**
   - Staff tab exists but no listing of assigned staff shown
   - Unclear how to invite staff or assign roles
   - No email templates for staff invitations
   - Recommendation: Add staff directory, bulk invite, role management

5. **Event Visibility/Publishing Flow Unclear**
   - Events have "status" field (published/draft)
   - No publish/draft toggle visible on event page
   - Unclear when event goes live publicly
   - Recommendation: Add clear publish button to event management

6. **Check-in Features Fragmented**
   - Check-in tab exists separately in event management
   - Scanner page exists at `/orgs/[orgId]/events/[eventId]/checkin`
   - No indication of how many events need check-in setup
   - Recommendation: Add check-in status to event list card

7. **Missing Payouts Integration**
   - "Payouts" tab exists on event page
   - No indication of payout status, schedule, or bank setup
   - Likely incomplete feature
   - Recommendation: Complete payout flow (bank account setup, payout history)

8. **No Event Templates or Drafts**
   - Each event created from scratch
   - No ability to duplicate/template popular events
   - Time cost for recurring events high
   - Recommendation: Add event templates and duplication

### Priority Actions for Organizers
1. **HIGH**: Document/complete org onboarding flow (post-signup)
2. **HIGH**: Audit event creation wizard UX (mobile-friendly, clear guidance)
3. **HIGH**: Complete payouts integration (bank setup, history)
4. **MEDIUM**: Improve staff management (directory, invitations, roles)
5. **MEDIUM**: Add event publish/draft toggle
6. **MEDIUM**: Add event templates and duplication
7. **LOW**: Enhance analytics with time filtering and drill-down
8. **LOW**: Add check-in status to event list

---

## CROSS-JOURNEY OBSERVATIONS

### Navigation Issues
- **Single Header for Both Roles**: Header shows "Create Events" to all users
  - Solution: Use context/permissions to show role-specific nav
  - Attendees: Browse → Tickets → Profile
  - Organizers: Dashboard → Events → Staff → Analytics

### Authentication Gaps
- **No Signup Page Visible**: Login page exists but no clear signup flow
  - `/app/(auth)/login/page.tsx` exists but no `/signup` found
  - Recommendation: Create signup page or link to it

### Demo Mode Helpful but Confusing
- Demo credentials baked into auth
- Works well for testing but:
  - Users might miss real auth setup
  - Mixed demo/production experiences
  - Recommendation: Add banner "Demo Mode" in dev/staging

### Missing Onboarding
- Both journeys lack guided onboarding
- No tours or "getting started" checklists
- High friction for new users
- Recommendation: Add interactive tours for both roles

---

## SUMMARY TABLE

| Aspect | Attendee | Organizer | Status |
|--------|----------|-----------|--------|
| Event Discovery | Good | N/A | ✓ Works |
| Purchase Flow | Functional | N/A | ⚠️ Needs auth prompt |
| Ticket Management | Good | N/A | ✓ Works |
| Check-in Experience | (UX TBD) | Good | ⚠️ Staff flow unclear |
| Analytics/KPIs | N/A | Good | ✓ Works |
| Event Creation | N/A | Unclear | ⚠️ Needs audit |
| Staff Management | N/A | Fragmented | ⚠️ Needs completion |
| Onboarding | Missing | Missing | ✗ Critical gap |
| Navigation | Confusing | Scattered | ⚠️ Needs consolidation |
| Payouts | N/A | Incomplete | ✗ Critical gap |

---

## Recommended Quick Wins (2-3 Day Sprints)

### Sprint 1: Navigation & Role-Based UI
- [ ] Move "Create Events" to organizer-only nav
- [ ] Add role-based header variant for attendees
- [ ] Create org dropdown in desktop-shell for organizers

### Sprint 2: Event Creation & Publishing
- [ ] Add publish/draft toggle to event management
- [ ] Document EventWizardClient requirements
- [ ] Add event duplication feature

### Sprint 3: Attendee Friction
- [ ] Add sign-in prompt before checkout
- [ ] Show QR/PDF download immediately post-purchase
- [ ] Add event search filters (city, category, date)

### Sprint 4: Organizer Completeness
- [ ] Complete staff management UI (directory, invites)
- [ ] Add payouts bank setup flow
- [ ] Create org onboarding flow post-signup

---

## Metrics to Track Post-Implementation

- **Attendees**: Conversion rate (browse → purchase), checkout completion, ticket downloads
- **Organizers**: Org creation rate, event creation rate, staff added per org, payouts setup
- **Both**: Signup-to-first-action time, feature discoverability (analytics, searches)
