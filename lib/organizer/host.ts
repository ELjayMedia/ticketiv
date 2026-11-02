/**
 * organizer.ticketiv.app — the web half of the Ticketiv Organizer app (ADR 0002).
 *
 * Off until NEXT_PUBLIC_ORGANIZER_HOST is set (e.g. "organizer.ticketiv.app"),
 * so previews, local dev and production keep working unchanged until the DNS
 * record and Vercel domain exist. When it is set:
 *
 *   organizer host  "/"            → /orgs (pick a workspace)
 *                   organizer and
 *                   account paths  → served
 *                   anything else  → same path on the attendee site
 *   attendee host   /orgs/…        → same path on the organizer host
 *
 * /scan is served on both hosts and never redirected: paired gate devices
 * keep their offline data per origin, so moving them would unpair them.
 *
 * Login works on both hosts only if the Supabase auth cookie is shared, so set
 * NEXT_PUBLIC_AUTH_COOKIE_DOMAIN (".ticketiv.app") together with the host.
 *
 * Edge-safe: used by the proxy (middleware) as well as server and client code.
 */

// Each NEXT_PUBLIC_ variable is read by its literal name so Next.js inlines it
// into browser bundles too (the org nav builds links with these helpers).
const PUBLIC_ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_ORGANIZER_HOST: process.env.NEXT_PUBLIC_ORGANIZER_HOST,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_AUTH_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN,
}

const ORGANIZER_PREFIXES = ["/orgs", "/onboarding/organizer"]

/** Served on the organizer host as well as the attendee site. */
const SHARED_PREFIXES = [
  "/scan",
  "/login",
  "/sign-in",
  "/signup",
  "/verify",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/auth/",
  "/launch",
  "/onboarding",
  "/403",
  "/maintenance",
  "/api/",
  "/invite/",
]

function hasPrefix(path: string, prefix: string): boolean {
  if (prefix.endsWith("/")) return path.startsWith(prefix)
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function isOrganizerPath(path: string): boolean {
  return ORGANIZER_PREFIXES.some((prefix) => hasPrefix(path, prefix))
}

function isSharedPath(path: string): boolean {
  return SHARED_PREFIXES.some((prefix) => hasPrefix(path, prefix))
}

function normalizeHost(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase()
  if (!trimmed) return null
  try {
    return new URL(/^[a-z]+:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`).host
  } catch {
    return null
  }
}

export interface OrganizerHostConfig {
  /** e.g. "organizer.ticketiv.app"; null turns the subdomain off. */
  organizerHost: string | null
  /** e.g. "ticketiv.app" */
  attendeeHost: string
}

export function organizerHostConfig(env: Record<string, string | undefined> = PUBLIC_ENV): OrganizerHostConfig {
  return {
    organizerHost: normalizeHost(env.NEXT_PUBLIC_ORGANIZER_HOST),
    attendeeHost: normalizeHost(env.NEXT_PUBLIC_APP_URL) ?? "ticketiv.app",
  }
}

/**
 * Where a request should go instead, or null to serve it here. Pure: takes the
 * request URL and config, so the proxy and tests share one rule.
 */
export function organizerHostRedirect(requestUrl: string, config: OrganizerHostConfig = organizerHostConfig()): string | null {
  const { organizerHost, attendeeHost } = config
  if (!organizerHost) return null

  let url: URL
  try {
    url = new URL(requestUrl)
  } catch {
    return null
  }
  const host = url.host.toLowerCase()
  const path = url.pathname

  if (host === organizerHost) {
    if (path === "/") {
      url.pathname = "/orgs"
      return url.toString()
    }
    if (isOrganizerPath(path) || isSharedPath(path)) return null
    url.protocol = "https:"
    url.host = attendeeHost
    return url.toString()
  }

  if (host === attendeeHost && isOrganizerPath(path)) {
    url.protocol = "https:"
    url.host = organizerHost
    return url.toString()
  }

  return null
}

/**
 * Supabase auth cookie options. With a shared domain (".ticketiv.app") one
 * login works on ticketiv.app and organizer.ticketiv.app.
 */
export function authCookieOptions(env: Record<string, string | undefined> = PUBLIC_ENV): { domain: string } | undefined {
  const domain = env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN?.trim()
  return domain ? { domain } : undefined
}

/**
 * Link to the attendee site from organizer pages. Relative when the subdomain
 * is off (same site), absolute when it is on.
 */
export function attendeeSiteUrl(path = "/", config: OrganizerHostConfig = organizerHostConfig()): string {
  if (!config.organizerHost) return path
  return `https://${config.attendeeHost}${path.startsWith("/") ? path : `/${path}`}`
}
