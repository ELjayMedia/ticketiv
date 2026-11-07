// Where a payment provider may send the buyer back to after checkout.
//
// The return URL arrives from the client (POST /api/payments/attempt), and the
// provider redirects the buyer there straight after they pay, so an
// unchecked value is an open redirect at the moment the buyer most trusts the
// page in front of them ("payment confirmed, re-enter your card..."). Only
// absolute http(s) URLs on our own origin, or same-origin paths, are kept;
// anything else falls back to the default confirmation page.

export function sameOriginReturnUrl(returnUrl: string | null | undefined, appUrl: string): string | null {
  if (!returnUrl) return null
  const trimmed = returnUrl.trim()
  if (!trimmed) return null

  let origin: URL
  try {
    origin = new URL(appUrl)
  } catch {
    return null
  }

  let candidate: URL
  try {
    // Resolving relative input against our origin turns "/orders/x" into an
    // absolute URL, while "//evil.example" and "https://evil.example" keep
    // their own host and are rejected below.
    candidate = new URL(trimmed, origin)
  } catch {
    return null
  }

  if (candidate.protocol !== "https:" && candidate.protocol !== "http:") return null
  if (candidate.origin !== origin.origin) return null
  if (candidate.username || candidate.password) return null
  return candidate.toString()
}
