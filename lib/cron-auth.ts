import "server-only"

import { createHash, timingSafeEqual } from "node:crypto"

const digest = (value: string) => createHash("sha256").update(value).digest()

/**
 * Constant-time string comparison. Both sides are hashed to the same length
 * first, so response timing says nothing about how much of a guess was right.
 * An empty or missing expected value never matches.
 */
export function secretMatches(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!expected || provided == null) return false
  return timingSafeEqual(digest(provided), digest(expected))
}

/** True when the request carries `Authorization: Bearer <secret>` (CRON_SECRET by default). */
export function isAuthorizedCronRequest(request: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret) return false
  return secretMatches(request.headers.get("authorization") ?? "", `Bearer ${secret}`)
}

/**
 * Shared-secret check for device and service endpoints that accept the secret
 * either as `Authorization: Bearer <secret>` or in a dedicated header.
 */
export function hasSharedSecret(request: Request, secret: string | undefined, headerName: string): boolean {
  if (!secret) return false
  return isAuthorizedCronRequest(request, secret) || secretMatches(request.headers.get(headerName), secret)
}
