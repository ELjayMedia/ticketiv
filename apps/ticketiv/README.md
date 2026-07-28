# Ticketiv — consumer app (`com.ticketiv.app`)

React Native consumer app per [ADR 0001](../../docs/adr/0001-mobile-packaging.md).

This directory is a workspace placeholder created by the monorepo scaffold
(TICK-328). The actual React Native project is initialized in **TICK-317**
(Android/playRelease), **TICK-318** (iOS) and **TICK-319** (huaweiRelease),
on a development machine with the Android SDK / Xcode available.

## Ground rules (from the ADR)

- Android product flavours: `playRelease` (FCM, Google Wallet) and
  `huaweiRelease` (HMS Push, no Google Wallet). Core app identical; **no
  unconditional Google Play Services dependency**.
- App Store metadata is pinned in `src/app-config.ts` as `iosRelease`
  (`ticketiv-ios-release.ipa`, `com.ticketiv.app`) so the native shell has one
  release matrix to consume when TICK-318 initializes it.
- Checkout uses external processors (Paystack etc.) — never Play Billing /
  Apple IAP for event tickets.
- Shared logic comes from `@ticketiv/shared`; design tokens from
  `@ticketiv/tokens`. Do not fork formatting/validation logic into this app.

## Launch feature set

Discovery without login · event detail + ticket selection · checkout via
approved processors · My Tickets with offline storage · QR display ·
transfers/refunds/history · wallet passes · push (FCM/APNs/HMS, TICK-324) ·
deep links (`/t/[token]`, event pages, auth redirects).
