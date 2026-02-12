"use client"

import { createContext, useContext } from "react"
import { usePermissions } from "@/lib/providers/permissions-provider"

type UserRole = "guest" | "attendee" | "organizer"

interface AuthContextType {
  isLoggedIn: boolean
  role: UserRole
  orgId: string | null
  userId: string | null
  email?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function useAuth(): AuthContextType {
  const { userId, profile, activeOrgId, permissions, isLoading } = usePermissions()

  // Determine role based on permissions
  let role: UserRole = "guest"

  if (userId && permissions) {
    // If user has org memberships, they're an organizer
    if (permissions.orgMemberships && permissions.orgMemberships.length > 0) {
      role = "organizer"
    } else {
      // Otherwise they're an attendee
      role = "attendee"
    }
  }

  return {
    isLoggedIn: !!userId,
    role,
    orgId: activeOrgId,
    userId,
    email: profile?.email,
  }
}
