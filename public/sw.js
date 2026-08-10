/* Ticketiv service worker — Web Push (TICK-214) and offline tickets (TICK-372).
 *
 * Push payload:
 *   { "title": "...", "body": "...", "url": "/...", "tag": "..." }
 *
 * Offline ticket copies are opt-in. Only an authenticated, successfully
 * rendered /tickets/<order-item-id> document and its same-origin Next assets
 * are saved. The scanner remains authoritative for revocation and check-in.
 */

const OFFLINE_TICKET_CACHE = "ticketiv-offline-tickets-v1";
const OFFLINE_ASSET_CACHE = "ticketiv-offline-assets-v1";
const OFFLINE_META_CACHE = "ticketiv-offline-meta-v1";
const OFFLINE_META_PREFIX = "/__ticketiv/offline-ticket/";
const TICKET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ticketIdFromUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return null;
    const match = url.pathname.match(/^\/tickets\/([^/]+)\/?$/);
    const ticketId = match ? decodeURIComponent(match[1]) : null;
    return ticketId && TICKET_ID_PATTERN.test(ticketId) ? ticketId : null;
  } catch {
    return null;
  }
}

function metaRequest(ticketId) {
  return new Request(
    new URL(`${OFFLINE_META_PREFIX}${encodeURIComponent(ticketId)}`, self.location.origin),
  );
}

async function readMeta(ticketId) {
  const cache = await caches.open(OFFLINE_META_CACHE);
  const response = await cache.match(metaRequest(ticketId));
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    await cache.delete(metaRequest(ticketId));
    return null;
  }
}

async function deleteOfflineTicket(meta) {
  const ticketCache = await caches.open(OFFLINE_TICKET_CACHE);
  const metaCache = await caches.open(OFFLINE_META_CACHE);
  if (meta && typeof meta.url === "string") {
    await ticketCache.delete(meta.url);
  }
  if (meta && typeof meta.ticketId === "string") {
    await metaCache.delete(metaRequest(meta.ticketId));
  }
}

async function purgeExpiredAndOtherOwners(activeOwnerId) {
  const metaCache = await caches.open(OFFLINE_META_CACHE);
  const keys = await metaCache.keys();
  const now = Date.now();

  await Promise.all(keys.map(async (key) => {
    const response = await metaCache.match(key);
    if (!response) return;
    let meta;
    try {
      meta = await response.json();
    } catch {
      await metaCache.delete(key);
      return;
    }

    const expired = !Number.isFinite(Date.parse(meta.expiresAt))
      || Date.parse(meta.expiresAt) <= now;
    const anotherOwner = activeOwnerId
      && meta.ownerId
      && meta.ownerId !== activeOwnerId;

    if (expired || anotherOwner) {
      await deleteOfflineTicket(meta);
    }
  }));
}

async function cacheStaticAssets(assetUrls) {
  const cache = await caches.open(OFFLINE_ASSET_CACHE);
  const safeUrls = [...new Set(Array.isArray(assetUrls) ? assetUrls : [])]
    .filter((value) => {
      try {
        const url = new URL(value, self.location.origin);
        return url.origin === self.location.origin
          && url.pathname.startsWith("/_next/static/");
      } catch {
        return false;
      }
    })
    .slice(0, 80);

  await Promise.allSettled(safeUrls.map(async (url) => {
    const response = await fetch(url, { credentials: "same-origin", cache: "reload" });
    if (response.ok) await cache.put(url, response);
  }));
}

async function saveOfflineTicket(message) {
  const ticketId = typeof message.ticketId === "string" ? message.ticketId : "";
  const ownerId = typeof message.ownerId === "string" ? message.ownerId : "";
  const expiresAt = typeof message.expiresAt === "string" ? message.expiresAt : "";
  const url = typeof message.url === "string" ? new URL(message.url, self.location.origin) : null;

  if (
    !TICKET_ID_PATTERN.test(ticketId)
    || !ownerId
    || !url
    || url.origin !== self.location.origin
    || ticketIdFromUrl(url.href) !== ticketId
    || !Number.isFinite(Date.parse(expiresAt))
    || Date.parse(expiresAt) <= Date.now()
  ) {
    return { ok: false, available: false, error: "This ticket cannot be saved offline." };
  }

  await purgeExpiredAndOtherOwners(ownerId);

  const response = await fetch(url.href, {
    credentials: "include",
    cache: "reload",
  });
  const finalTicketId = ticketIdFromUrl(response.url || url.href);
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || response.redirected || finalTicketId !== ticketId || !contentType.includes("text/html")) {
    return {
      ok: false,
      available: false,
      error: "Sign in and refresh this valid ticket before saving it offline.",
    };
  }

  const ticketCache = await caches.open(OFFLINE_TICKET_CACHE);
  await ticketCache.put(url.href, response.clone());
  await cacheStaticAssets(message.assetUrls);

  const savedAt = new Date().toISOString();
  const meta = { ticketId, ownerId, url: url.href, savedAt, expiresAt };
  const metaCache = await caches.open(OFFLINE_META_CACHE);
  await metaCache.put(
    metaRequest(ticketId),
    new Response(JSON.stringify(meta), {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    }),
  );

  return { ok: true, available: true, savedAt, expiresAt };
}

async function getOfflineTicket(message) {
  const ticketId = typeof message.ticketId === "string" ? message.ticketId : "";
  const ownerId = typeof message.ownerId === "string" ? message.ownerId : "";
  if (!TICKET_ID_PATTERN.test(ticketId) || !ownerId) {
    return { ok: false, available: false, error: "Invalid offline ticket request." };
  }

  await purgeExpiredAndOtherOwners(ownerId);
  const meta = await readMeta(ticketId);
  if (!meta || meta.ownerId !== ownerId) return { ok: true, available: false };

  const ticketCache = await caches.open(OFFLINE_TICKET_CACHE);
  const document = await ticketCache.match(meta.url);
  if (!document) {
    await deleteOfflineTicket(meta);
    return { ok: true, available: false };
  }

  return {
    ok: true,
    available: true,
    savedAt: meta.savedAt,
    expiresAt: meta.expiresAt,
  };
}

async function removeOfflineTicketCopy(message) {
  const ticketId = typeof message.ticketId === "string" ? message.ticketId : "";
  const ownerId = typeof message.ownerId === "string" ? message.ownerId : "";
  const meta = TICKET_ID_PATTERN.test(ticketId) ? await readMeta(ticketId) : null;

  if (meta && meta.ownerId === ownerId) await deleteOfflineTicket(meta);
  return { ok: true, available: false };
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    purgeExpiredAndOtherOwners(null),
  ]));
});

self.addEventListener("message", (event) => {
  const type = event.data && event.data.type;
  if (![
    "SAVE_OFFLINE_TICKET",
    "GET_OFFLINE_TICKET",
    "REMOVE_OFFLINE_TICKET",
  ].includes(type)) return;

  event.waitUntil((async () => {
    let result;
    try {
      if (type === "SAVE_OFFLINE_TICKET") {
        result = await saveOfflineTicket(event.data);
      } else if (type === "GET_OFFLINE_TICKET") {
        result = await getOfflineTicket(event.data);
      } else {
        result = await removeOfflineTicketCopy(event.data);
      }
    } catch {
      result = {
        ok: false,
        available: false,
        error: "The offline ticket service could not complete this request.",
      };
    }
    if (event.ports && event.ports[0]) event.ports[0].postMessage(result);
  })());
});

function offlineFallbackResponse() {
  return new Response(
    `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>Ticket unavailable offline · Ticketiv</title>
        <style>
          body{margin:0;background:#0a0a0c;color:#fff;font:16px system-ui,sans-serif}
          main{min-height:100vh;display:grid;place-content:center;padding:24px;text-align:center}
          p{max-width:34rem;color:#c7c7cc;line-height:1.55}
          a{color:#fff}
        </style>
      </head>
      <body><main><h1>Ticket not saved offline</h1>
        <p>Reconnect, open this ticket and choose “Save offline” before arriving at the gate.</p>
        <p><a href="/tickets">Return to My tickets</a></p>
      </main></body>
    </html>`,
    { status: 503, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const ticketId = ticketIdFromUrl(event.request.url);
  if (event.request.mode === "navigate" && ticketId) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        const meta = await readMeta(ticketId);
        if (
          meta
          && response.ok
          && !response.redirected
          && ticketIdFromUrl(response.url || event.request.url) === ticketId
        ) {
          const ticketCache = await caches.open(OFFLINE_TICKET_CACHE);
          await ticketCache.put(meta.url, response.clone());
          meta.savedAt = new Date().toISOString();
          const metaCache = await caches.open(OFFLINE_META_CACHE);
          await metaCache.put(
            metaRequest(ticketId),
            new Response(JSON.stringify(meta), {
              headers: { "content-type": "application/json", "cache-control": "no-store" },
            }),
          );
        }
        return response;
      } catch {
        const meta = await readMeta(ticketId);
        if (meta && Date.parse(meta.expiresAt) > Date.now()) {
          const ticketCache = await caches.open(OFFLINE_TICKET_CACHE);
          const saved = await ticketCache.match(meta.url);
          if (saved) return saved;
        }
        if (meta) await deleteOfflineTicket(meta);
        return offlineFallbackResponse();
      }
    })());
    return;
  }

  const url = new URL(event.request.url);
  if (
    url.origin === self.location.origin
    && url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith((async () => {
      try {
        return await fetch(event.request);
      } catch {
        const cache = await caches.open(OFFLINE_ASSET_CACHE);
        return (await cache.match(event.request)) || Response.error();
      }
    })());
  }
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
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(targetUrl).catch(() => {});
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
