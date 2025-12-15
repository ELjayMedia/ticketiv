export interface DemoUser {
  id: string
  email: string
  full_name: string
  role: "attendee" | "organizer" | "staff"
  org_id?: string
  created_at: string
}

export const DEMO_CREDENTIALS = {
  attendee: {
    email: "demo@ticketiv.com",
    password: "demo123456",
    user: {
      id: "demo-user-attendee",
      email: "demo@ticketiv.com",
      full_name: "Demo Attendee",
      role: "attendee",
      created_at: new Date().toISOString(),
    } as DemoUser,
  },
  organizer: {
    email: "organizer@ticketiv.com",
    password: "organizer123456",
    user: {
      id: "demo-user-organizer",
      email: "organizer@ticketiv.com",
      full_name: "Demo Organizer",
      role: "organizer",
      org_id: "demo-org-1",
      created_at: new Date().toISOString(),
    } as DemoUser,
  },
  staff: {
    email: "staff@ticketiv.com",
    password: "staff123456",
    user: {
      id: "demo-user-staff",
      email: "staff@ticketiv.com",
      full_name: "Demo Staff",
      role: "staff",
      created_at: new Date().toISOString(),
    } as DemoUser,
  },
}

const DEMO_SESSION_KEY = "ticketiv_demo_session"

export function isDemoCredentials(email: string, password: string): DemoUser | null {
  const credentials = Object.values(DEMO_CREDENTIALS).find((cred) => cred.email === email && cred.password === password)
  return credentials?.user || null
}

export function setDemoSessionCookie(user: DemoUser): void {
  if (typeof document !== "undefined") {
    // Set cookie that expires in 7 days
    const expires = new Date()
    expires.setDate(expires.getDate() + 7)
    document.cookie = `demo_session=${encodeURIComponent(JSON.stringify(user))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  }
}

export function clearDemoSessionCookie(): void {
  if (typeof document !== "undefined") {
    document.cookie = "demo_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"
  }
}

export function setDemoSession(user: DemoUser): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user))
    setDemoSessionCookie(user)
    console.log("[v0] Demo session created for:", user.email)
  }
}

export function getDemoSession(): DemoUser | null {
  if (typeof window === "undefined") return null

  try {
    const session = localStorage.getItem(DEMO_SESSION_KEY)
    if (!session) return null
    return JSON.parse(session) as DemoUser
  } catch (error) {
    console.error("[v0] Failed to parse demo session:", error)
    return null
  }
}

export function clearDemoSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEMO_SESSION_KEY)
    clearDemoSessionCookie()
    console.log("[v0] Demo session cleared")
  }
}

export function isDemoMode(): boolean {
  return getDemoSession() !== null
}
