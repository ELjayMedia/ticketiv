# Event Companion: on-device check

A 10-minute check on a real phone before each release that touches the
Event Companion. Automated tests cover the logic and the screens are rendered
in CI-style harnesses, but only a real phone shows scrolling, the keyboard,
images, offline behaviour and push.

## Setup

1. Use an Android phone with the latest **Ticketiv** build (Play internal testing,
   see `GOOGLE_PLAY_RELEASES.md`) and Chrome for the web parts.
2. In the admin console, pick a test event you control. In the organiser
   workspace, open **Attendee guide** and fill in doors, entrance, getting there,
   parking, two running-order lines, one venue fact and a help contact. Save.
3. Buy (or comp) one ticket to that event and open the ticket email on the phone.

## Before the event (stage: booked)

- [ ] Open the ticket link in the app. The ticket saves to the wallet.
- [ ] Below the QR: the purple band says **IN N DAYS** and **You're going**.
- [ ] Entrance, doors (in the event's local time), getting there, running order,
      house rules and help all show and match what you typed.
- [ ] Turn on airplane mode, close and reopen the app: the ticket and the guide
      still show.
- [ ] Web (Chrome on the phone): open the ticket's event guide. **Get reminders
      on this device** → **Turn on** → allow. The card changes to **Reminders on**.
      (Only shown once VAPID keys are set; see `NOTIFICATIONS.md`.)
- [ ] In the organiser workspace, post an update with **Notify ticket holders**.
      Within a minute: in-app notification, and a push on the phone if enabled.

## Event day and at the door

- [ ] Move the event start to within 12 hours (or check on the day). The band
      says **TODAY** and the QR comes first; the update shows.
- [ ] Scan the ticket with the organiser scanner. The web guide celebrates
      **You're in!**; the app shows **CHECKED IN** after it refreshes.

## After the event

- [ ] Move the event end to more than 3 hours ago. In the app: **You were there**,
      **How was it?** stars, highlights (add 2 photos from the organiser panel
      first), **Hear about their next event**, **Because you went**.
- [ ] Rate 4 stars with a comment, send. Message: only the organiser sees it.
      In the organiser panel, the rating appears with no name.
- [ ] Turn on **Hear about their next event**. Publish another event for the
      same organiser: one in-app alert (and push if enabled).
- [ ] Airplane mode: rating shows a plain "you're offline" message, nothing crashes.

Record the phone model, OS version and app build with the result in the PR.
