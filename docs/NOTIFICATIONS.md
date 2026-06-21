# Notification channels (TICK-180)

Ticket delivery fans out across channels via the dispatcher in
`lib/notifications/transactional.ts`, logging every attempt to `notifications`.
Each adapter returns a uniform `ChannelResult` (`sent` / `skipped` / `failed`)
and **every channel skips gracefully when unconfigured**, so an unconfigured or
failing channel never blocks payment completion — email is the durable receipt.

All channels send a **secure ticket link** (the capability-scoped `/t/{token}`
route), never the QR image, so the live ticket page reflects the current status
(transferred / refunded / revoked / checked-in) at the gate.

## Channel status

| Channel | State | Providers |
|---|---|---|
| **Email** | ✅ Live | Resend |
| **WhatsApp** | ✅ Live adapters | `meta_cloud`, `twilio`, `360dialog` |
| **SMS** | ✅ Live adapters | `twilio`, `africastalking`, `clickatell` |

"Live adapters" = real HTTP integrations (no SDK deps) that send when
credentials are present. They were authored and type-checked here but **not
exercised against live provider accounts** (no credentials in this
environment) — validate each with a real test send before launch.

## WhatsApp (`lib/notifications/channels/whatsapp.ts`)

Select with `WHATSAPP_PROVIDER` + `WHATSAPP_API_KEY`:

- **meta_cloud** — Meta WhatsApp Cloud API. `WHATSAPP_API_KEY` = access token;
  set `WHATSAPP_PHONE_NUMBER_ID` (and optionally `WHATSAPP_API_VERSION`).
  Transactional sends outside the 24-hour customer-service window require an
  **approved template** — set `WHATSAPP_TEMPLATE` (+ `WHATSAPP_TEMPLATE_LANG`)
  and the adapter sends a template message whose single body parameter is the
  ticket-link text. Without a template it sends plain text (in-session/testing).
- **twilio** — `WHATSAPP_API_KEY` = auth token; set `TWILIO_ACCOUNT_SID` +
  `WHATSAPP_FROM` (your WhatsApp sender in E.164).
- **360dialog** — `WHATSAPP_API_KEY` = D360 API key; optional
  `WHATSAPP_360_BASE_URL`.

**Pre-launch (external, not code):** verified Meta Business / BSP account,
approved `ticket_delivery` template, opted-in recipient numbers.

## SMS (`lib/notifications/channels/sms.ts`)

Select with `SMS_PROVIDER` + `SMS_API_KEY`:

- **twilio** — auth token; set `TWILIO_ACCOUNT_SID` + `SMS_FROM`.
- **africastalking** — AT api key; set `AT_USERNAME` (+ optional `SMS_FROM`
  sender id). Good SADC coverage.
- **clickatell** — one-API integration key.

Bodies stay compact (basic-device safe) and carry the short secure link.

## Email / Resend domain (`lib/notifications/channels/email.ts`)

Live today, sending from `onboarding@resend.dev` (Resend delivers that only to
the account owner until a domain is verified).

**Action (external, not code):** verify `ticketiv.com` in Resend (add the DKIM
/ SPF / return-path DNS records Resend provides), then set
`RESEND_FROM="Ticketiv <tickets@ticketiv.com>"`. No code change needed — the
adapter already reads `RESEND_FROM`.

## Status vs acceptance
- ✅ Live WhatsApp adapter (3 providers, template handling, secure link).
- ✅ Live SMS fallback adapter (3 providers).
- ✅ Graceful-skip preserved on every channel when unconfigured.
- ⏳ Resend `ticketiv.com` verification is a dashboard/DNS action (code ready).
- ⏳ Real test sends per provider need credentials (BSP account, Twilio/AT/
  Clickatell keys) — do this in staging before launch.
