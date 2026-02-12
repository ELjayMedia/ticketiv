/**
 * Mock Auth State Management
 * 
 * This module provides role-based auth state for the public → organizer funnel.
 * Replace with Supabase later by checking actual database roles.
 * 
 * Roles:
 * - guest: Not logged in
 * - attendee: Logged in but no org membership
 * - organizer: Logged in with org membership + admin role
 */

export type UserRole = "guest" | "attendee" | "organizer" | "staff"

export interface MockAuthState {
  isLoggedIn: boolean
  role: UserRole
  userId?: string
  email?: string
  orgId?: string
  orgName?: string
}

// Client-side mock auth state (in production, this comes from Supabase session)
export const MOCK_AUTH_STATES = {
  guest: {
    isLoggedIn: false,
    role: "guest" as const,
  },
  attendee: {
    isLoggedIn: true,
    role: "attendee" as const,
    userId: "user-attendee-123",
    email: "attendee@example.com",
  },
  organizer: {
    isLoggedIn: true,
    role: "organizer" as const,
    userId: "user-org-123",
    email: "organizer@example.com",
    orgId: "org-123",
    orgName: "My Amazing Events",
  },
}

export type MockAuthKey = keyof typeof MOCK_AUTH_STATES

/**
 * Get auth state from localStorage (for demo/testing)
 * In production, this comes from Supabase session
 */
export function getMockAuthState(key: MockAuthKey): MockAuthState {
  return MOCK_AUTH_STATES[key]
}

/**
 * Determine if user should see create event CTA
 */
export function canAccessCreateEvent(auth: MockAuthState): boolean {
  return true // Everyone can see the CTA
}

/**
 * Determine redirect after "Create Event" CTA
 */
export function getCreateEventRedirect(auth: MockAuthState): string {
  if (!auth.isLoggedIn) {
    return "/create?from=header" // Show value page
  }
  if (auth.role === "attendee") {
    return "/create?from=header" // Show value page with organizer setup CTA
  }
  if (auth.role === "organizer") {
    return `/orgs/${auth.orgId}/events/new` // Go directly to event wizard
  }
  return "/create"
}

/**
 * Determine if user can access organizer dashboard
 */
export function canAccessOrganizerDashboard(auth: MockAuthState): boolean {
  return auth.role === "organizer"
}

/**
 * Determine if user can access /create page
 */
export function canAccessCreatePage(auth: MockAuthState): boolean {
  return true // Everyone can view the value page
}
