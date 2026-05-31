export interface DemoUser {
  id: string
  email: string
  full_name: string
  role: "attendee" | "organizer" | "staff"
  org_id?: string
  created_at: string
}

/**
 * Demo authentication has been removed from production code.
 *
 * These no-op exports are kept temporarily so remaining call sites can be
 * migrated without reintroducing hardcoded credentials, demo users, cookies,
 * or localStorage-backed sessions.
 */
export function isDemoCredentials(_email: string, _password: string): DemoUser | null {
  return null
}

export function setDemoSessionCookie(_user: DemoUser): void {}

export function clearDemoSessionCookie(): void {}

export function setDemoSession(_user: DemoUser): void {}

export function getDemoSession(): DemoUser | null {
  return null
}

export function clearDemoSession(): void {}

export function isDemoMode(): boolean {
  return false
}

export async function getDemoSessionFromCookie(): Promise<DemoUser | null> {
  return null
}
