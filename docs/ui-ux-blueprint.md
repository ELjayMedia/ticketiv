# Ticketiv UI/UX Blueprint

This document captures the end-to-end surfaces required for the Ticketiv experience across attendees, organisers, scanner staff, and platform administrators. Use it as the canonical checklist when designing or building flows, aligning v0.app mocks, and mapping routes/components.

## 1. Attendee (Customer)

### Discovery (Web + Mobile)
- **Home / Explore Events** – primary browse surface for featured events and categories.
- **Search & Filter** – city, date, and category filters with search results.
- **Event Details** – description, venue info, artists lineup, dates/schedules, ticket tiers.
- **Artist Profile (optional)** – artist bio and linked events.

### Ticket Purchase Flow
- **Ticket Type Selection** – choose tier/quantity.
- **Seat Map Selection** – reserved seating variant.
- **Promo Code Input** – apply discounts.
- **Checkout** – buyer details, order summary, fees/discounts, payment options (DeltaPay, Paystack, Flutterwave).
- **Payment Processing** – in-progress state.
- **Payment Success** – confirmation and next steps.
- **Payment Failed / Retry** – recovery path.

### My Tickets
- **My Tickets List** – upcoming and past tickets.
- **Ticket Details** – QR code, holder info, add to wallet/download PDF.
- **Transfer Ticket** – initiate transfer.
- **Accept Transfer** – accept inbound transfer.
- **Refund Request** – if allowed.

### Wallet / Payments
- **Transaction History** – list of wallet/payment entries.
- **Payment Receipt** – detailed receipt view.
- **Refund Status** – track refund lifecycle.

### Guestlist
- **Guestlist Access** – verify entry eligibility.
- **Guestlist Redemption Confirmation** – confirm redeemed spot.

### Account
- **Sign Up / Sign In / Forgot Password**.
- **Profile Settings** – edit profile and manage devices/sessions.
- **Notifications Settings**.

## 2. Organizer (Event Owners) — Web Dashboard

### Dashboard Home
- **Organizer Overview** – tickets sold, revenue, check-ins, trends.

### Events Management
- **Events List** – browse and filter owned events.
- **Create New Event (multi-step)** – basics, venue selection, dates, artists, media upload.
- **Event Settings** – configuration after creation.
- **Event Media Manager** – posters, images, promos.

### Ticketing Setup
- **Ticket Types** – list/add/edit ticket types.
- **Sales Channels Config** – channel availability controls.
- **Promo Codes / Price Rules** – manage discounts and rules.
- **Seat Map Builder** – design reserved seating maps.
- **Seat Allocation** – assign seats to ticket types or holds.

### Orders & Customers
- **Orders List** – search and filter orders.
- **Order Details** – payment and attendee info.
- **Refund Management** – approve or deny refunds.
- **Guestlist Management** – entries and fulfilment.
- **Attendee List / CSV Export** – attendee roster and exports.

### Staff & Device Management
- **Event Staff** – manage staff roles.
- **Add/Edit Staff Member** – invite or update staff.
- **Device Management** – register scanners.
- **Add Scanner / Pair Device** – pairing flow.

### Finance & Payouts
- **Financial Overview** – revenue, fees, settlements.
- **Ledger Entries** – line-by-line ledger.
- **Payout Accounts Setup** – banking/settlement setup.
- **Request Payout** – initiate payouts.
- **Payout History** – payout records.

### Analytics
- **Sales Analytics** – revenue, volume, trends.
- **Check-in Analytics** – entry stats.
- **Promo Code Usage** – performance by code.
- **Channel Breakdown** – sales by channel.

### Integrations & Settings
- **Webhook Configuration**.
- **Feature Flags (per org)**.
- **Organization Settings**.

## 3. Scanner App (Event Staff) — Mobile

- **Device Login / Pair Device**.
- **Scanner Home**.
- **Camera Scanner**.
- **Scan Result – Success**.
- **Scan Result – Invalid**.
- **Offline Mode Sync**.
- **Check-in Stats Summary**.

## 4. Platform Admin (Internal Team) — Web

- **Admin Dashboard**.
- **Organizations Management**.
- **User Accounts Overview**.
- **Global Ledger & Settlements**.
- **Payout Approvals**.
- **Audit Log Viewer (app & auth logs)**.
- **Jobs Queue Monitor**.
- **Webhook Failure Monitor**.
- **Feature Flags Global Management**.

## 5. Shared System Screens (Web + Mobile)

- **Error / 404 / 500** states.
- **Maintenance Mode**.
- **Loading States / Skeletons**.
- **Legal Pages** – Privacy Policy, Terms, Refund Policy.

---
Use this blueprint to validate route coverage, component needs, and QA completeness before shipping changes across the web and mobile experiences.
