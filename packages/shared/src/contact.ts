/**
 * Canonical Ticketiv contact addresses. Single source of truth for every
 * user-facing mailto link and prose mention across web and the RN apps.
 *
 * Mail for ticketiv.app must be provisioned (MX/forwarding + Resend domain
 * verification) before changing these — a wrong address here silently
 * blackholes buyer support.
 */

export const SUPPORT_EMAIL = "support@ticketiv.app";
export const PRIVACY_EMAIL = "privacy@ticketiv.app";

/**
 * `mailto:` URL for the support inbox with optional prefilled subject/body.
 * Uses percent-encoding (not URLSearchParams' form encoding) — mail clients
 * render `+` literally in mailto subjects.
 */
export function supportMailto(subject?: string, body?: string): string {
  const parts: string[] = [];
  if (subject) parts.push(`subject=${encodeURIComponent(subject)}`);
  if (body) parts.push(`body=${encodeURIComponent(body)}`);
  return parts.length > 0
    ? `mailto:${SUPPORT_EMAIL}?${parts.join("&")}`
    : `mailto:${SUPPORT_EMAIL}`;
}
