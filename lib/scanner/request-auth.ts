import type { User } from "@supabase/supabase-js"

import { isExpectedSignedOutAuthError } from "@/lib/supabase/auth-errors"

export interface ScannerRequestAuthClient {
  auth: {
    getUser: () => Promise<{
      data: { user: User | null }
      error: unknown
    }>
  }
}

export type ScannerRequestUserResult =
  | { user: User; error: null }
  | { user: null; error: null }
  | { user: null; error: unknown }

/**
 * Resolve an authenticated browser user without trusting cookie-backed
 * getSession() data. A missing/stale browser session is normal for a
 * provisioned scanner device, so callers can then verify the device session.
 */
export async function getVerifiedScannerRequestUser(
  client: ScannerRequestAuthClient,
): Promise<ScannerRequestUserResult> {
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser()

    if (error) {
      return isExpectedSignedOutAuthError(error)
        ? { user: null, error: null }
        : { user: null, error }
    }

    return user ? { user, error: null } : { user: null, error: null }
  } catch (error) {
    return isExpectedSignedOutAuthError(error)
      ? { user: null, error: null }
      : { user: null, error }
  }
}
