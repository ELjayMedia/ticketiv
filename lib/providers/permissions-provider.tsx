"use client"

import React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { Permissions } from "@/lib/rbac"

interface PermissionsContextType {
  userId: string | null
  profile: {
    id: string
    email: string
    display_name?: string | null
  } | null
  permissions: Permissions | null
  activeOrgId: string | null
  setActiveOrgId: (orgId: string | null) => void
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<PermissionsContextType["profile"]>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadPermissions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/auth/permissions")
      if (!response.ok) {
        throw new Error("Failed to load permissions")
      }

      const data = await response.json()

      setUserId(data.userId)
      setProfile(data.profile)
      setPermissions(data.permissions)
      setActiveOrgId(data.permissions.activeOrgId)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      console.error("[v0] Failed to load permissions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPermissions()
  }, [])

  // Handle activeOrgId changes with localStorage fallback
  useEffect(() => {
    if (activeOrgId) {
      try {
        localStorage.setItem("activeOrgId", activeOrgId)
      } catch (e) {
        console.warn("[v0] Failed to save activeOrgId to localStorage", e)
      }
    }
  }, [activeOrgId])

  const value: PermissionsContextType = {
    userId,
    profile,
    permissions,
    activeOrgId,
    setActiveOrgId,
    isLoading,
    error,
    refresh: loadPermissions,
  }

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>
}

export function usePermissions() {
  const context = useContext(PermissionsContext)
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider")
  }
  return context
}

/**
 * Hook to check if user can perform an action
 */
export function useCanAccess(
  action: string,
  scope?: { orgId?: string; eventId?: string }
) {
  const { permissions } = usePermissions()

  if (!permissions) return false

  switch (action) {
    case "admin":
      return permissions.isGlobalAdmin

    case "org:access":
      return scope?.orgId
        ? permissions.orgMemberships.some((m) => m.org_id === scope.orgId)
        : false

    case "org:manage":
      return scope?.orgId
        ? permissions.orgMemberships.some(
            (m) => m.org_id === scope.orgId && (m.role === "admin" || m.role === "organizer")
          )
        : false

    case "org:finance":
      return scope?.orgId
        ? permissions.orgMemberships.some(
            (m) =>
              m.org_id === scope.orgId &&
              (m.role === "admin" || m.role === "finance" || m.role === "organizer")
          )
        : false

    case "event:create":
      return scope?.orgId
        ? permissions.orgMemberships.some(
            (m) => m.org_id === scope.orgId && (m.role === "admin" || m.role === "organizer")
          )
        : false

    case "event:manage":
      return (
        permissions.isGlobalAdmin ||
        (scope?.eventId && permissions.eventAccessByEventId[scope.eventId] !== undefined)
      )

    case "event:scan":
      return (
        permissions.isGlobalAdmin ||
        (scope?.eventId &&
          ["scanner", "admin", "organizer"].includes(
            permissions.eventAccessByEventId[scope.eventId] || ""
          ))
      )

    default:
      return false
  }
}

/**
 * Hook to get org role
 */
export function useOrgRole(orgId: string) {
  const { permissions } = usePermissions()

  if (!permissions) return null

  const membership = permissions.orgMemberships.find((m) => m.org_id === orgId)
  return membership?.role || null
}
