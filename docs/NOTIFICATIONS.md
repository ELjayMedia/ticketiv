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

**Action (external, not code):** verify `ticketiv.app` in Resend (add the DKIM
/ SPF / return-path DNS records Resend provides), then set
`RESEND_FROM="Ticketiv <tickets@ticketiv.app>"`. No code change needed — the
adapter already reads `RESEND_FROM`.

## Status vs acceptance
- ✅ Live WhatsApp adapter (3 providers, template handling, secure link).
- ✅ Live SMS fallback adapter (3 providers).
- ✅ Graceful-skip preserved on every channel when unconfigured.
- ⏳ Resend `ticketiv.app` verification is a dashboard/DNS action (code ready).
- ⏳ Real test sends per provider need credentials (BSP account, Twilio/AT/
  Clickatell keys) — do this in staging before launch.

## Web Push (Event Companion reminders and updates)

Event reminders, official organiser updates, "How was it?" and new-event
alerts from followed organisers go out as Web Push to devices that opted in
(the **Get reminders on this device** card in the event guide, or the waitlist
opt-in). Delivery runs hourly from `/api/cron/reminder-emails` (pg_cron
`ticketiv-reminder-emails`), and immediately for updates posted with
**Notify ticket holders**. Each notification is pushed at most once
(`notifications` row, channel `push`, dedupe `push:<in-app key>`), and the
**Push** switch in Me › Reminders turns it off.

Push is off until two Vercel environment variables are set (Production and
Preview):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key |
| `VAPID_PRIVATE_KEY` | VAPID private key (sensitive) |

Generate a pair once, locally, and keep the private key out of chat and Git:

```bash
npx web-push generate-vapid-keys
```

Redeploy after setting them: the public key is built into the web app.
Rotating the keys invalidates existing subscriptions; people re-enable on
their device.

Native app push (Android/iOS) is not wired yet: it needs a Firebase project
(`google-services.json`, FCM credentials) before the app can register devices.
