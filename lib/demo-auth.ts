export interface DemoUser {
  id: string
  email: string
  full_name: string
  role: "attendee" | "organizer" | "staff"
  org_id?: string
  created_at: string
}

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
