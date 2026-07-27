# Ticketiv Access — staff app (`com.ticketiv.access`)

React Native operations app per [ADR 0001](../../docs/adr/0001-mobile-packaging.md).
Scanning deliberately does **not** live in the consumer app: Access gets
tighter permissions, a simpler gate UI, and an independent release cycle —
a consumer update must never destabilise check-in.

This workspace now contains the TICK-329 Access app core: app identity,
Android build-target config, deep-link config and scanner session state that
reuses `@ticketiv/shared` contracts. The full React Native shell is still
initialized Android-first (`playRelease` + `huaweiRelease` flavours); iOS
follows later (TICK-331) once iPhone gate-scanning is validated at a live event.

## Launch feature set

Staff login / device pairing via short code (TICK-274 provisioning path) ·
event assignment · QR scanning · offline validation with encrypted local
manifests · background sync · duplicate-entry warnings · per-device check-in
totals · remote session termination. NFC/TapBand check-in behind a feature
flag (TICK-294). Outlet sales come later.

## Ground rules

- Reuse the scanner manifest/session/outcome logic (`lib/scanner/`) through
  `@ticketiv/shared` as it gets extracted — do not fork validation rules.
- Must run on Huawei devices without GMS.
- App Store metadata is pinned in `src/app-config.ts` as `iosRelease`
  (`ticketiv-access-ios-release.ipa`, `com.ticketiv.access`) for the later
  TICK-331 iPhone validation/build step.
