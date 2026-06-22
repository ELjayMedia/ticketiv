/* Ticketiv service worker — Web Push (TICK-214).
 *
 * Scope: handles incoming push messages and notification clicks for waitlist
 * offer notifications. Registered from the client by lib/push/client.ts.
 *
 * The push payload is expected to be JSON of the shape:
 *   {
 *     "title": "[Event name] — A ticket is available! Offer expires in [X] minutes.",
 *     "body":  "...",
 *     "url":   "/checkout/waitlist/<waitlistId>",
 *     "tag":   "waitlist-offer-<waitlistId>"
 *   }
 * Sent by the (TODO) server-side VAPID sender. Until that sender ships, this
 * worker still installs cleanly and is a no-op when no push arrives.
 */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Ticketiv", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Ticketiv";
  const url = typeof data.url === "string" ? data.url : "/";

  const options = {
    body: data.body || "A ticket is available.",
    icon: data.icon || "/icon-light-32x32.png",
    badge: data.badge || "/icon-light-32x32.png",
    tag: data.tag || "ticketiv",
    renotify: true,
    data: { url },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus an existing tab and navigate it if one is open.
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        }
        // Otherwise open a fresh window at the offer checkout.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
