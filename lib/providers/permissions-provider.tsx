"use client"

import React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { Permissions } from "@/lib/rbac"
import { cacheStore } from "@/lib/cache-store"

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
  /**
   * Returns true if the activeOrgId is valid (exists in memberships)
   * Useful for conditional rendering
   */
  isActiveOrgValid: boolean
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined)

/**
 * Validates and normalizes activeOrgId:
 * 1. If activeOrgId is in orgMemberships, keep it
 * 2. Fallback to profile.default_org_id if valid
 * 3. Fallback to first org in memberships
 * 4. Return null if no orgs available
 */
function validateAndNormalizeActiveOrgId(
  requestedOrgId: string | null,
  permissions: Permissions,
  profile: { default_org_id?: string | null } | null
): string | null {
  const availableOrgIds = new Set(permissions.orgMemberships.map((m) => m.org_id))

  // If requested org is available, use it
  if (requestedOrgId && availableOrgIds.has(requestedOrgId)) {
    return requestedOrgId
  }

  // Fallback to profile's default org if available
  if (profile?.default_org_id && availableOrgIds.has(profile.default_org_id)) {
    console.log("[v0] Active org not available, falling back to profile default:", profile.default_org_id)
    return profile.default_org_id
  }

  // Fallback to first available org
  if (permissions.orgMemberships.length > 0) {
    console.log("[v0] Active org not available, falling back to first org:", permissions.orgMemberships[0].org_id)
    return permissions.orgMemberships[0].org_id
  }

  // No orgs available
  console.warn("[v0] User has no org memberships")
  return null
}

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<PermissionsContextType["profile"] & { default_org_id?: string | null }>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isActiveOrgValid, setIsActiveOrgValid] = useState(false)

  const loadPermissions = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch("/api/auth/permissions")
      
      // Handle unauthenticated users gracefully
      if (response.status === 401) {
        console.log("[v0] User not authenticated, permissions not loaded")
        setUserId(null)
        setProfile(null)
        setPermissions(null)
        setActiveOrgIdState(null)
        setIsActiveOrgValid(false)
        return
      }

      if (!response.ok) {
        throw new Error(`Failed to load permissions: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      setUserId(data.userId)
      setProfile(data.profile)
      setPermissions(data.permissions)

      // Try to restore activeOrgId from localStorage, but validate it
      let activeOrgIdFromStorage: string | null = null
      try {
        activeOrgIdFromStorage = localStorage.getItem("activeOrgId")
      } catch (e) {
        console.warn("[v0] Failed to read activeOrgId from localStorage", e)
      }

      // Validate and normalize the active org
      const normalizedOrgId = validateAndNormalizeActiveOrgId(
        activeOrgIdFromStorage,
        data.permissions,
        data.profile
      )

      setActiveOrgIdState(normalizedOrgId)
      setIsActiveOrgValid(!!normalizedOrgId)

      console.log("[v0] Permissions loaded. Active org:", normalizedOrgId, "Valid:", !!normalizedOrgId)
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setError(error)
      console.error("[v0] Failed to load permissions:", error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPermissions()
  }, [])

  // Handle activeOrgId changes with validation and cache invalidation
  const setActiveOrgId = (newOrgId: string | null) => {
    if (!permissions) return

    // Validate new org ID exists in memberships
    const isValid = newOrgId === null || permissions.orgMemberships.some((m) => m.org_id === newOrgId)

    if (!isValid) {
      console.warn("[v0] Attempted to set invalid org ID:", newOrgId)
      return
    }

    const prevOrgId = activeOrgId

    // Update state
    setActiveOrgIdState(newOrgId)
    setIsActiveOrgValid(true)

    // Invalidate org-scoped caches when org changes
    if (prevOrgId !== newOrgId) {
      console.log("[v0] Org changed from", prevOrgId, "to", newOrgId, "- invalidating caches")
      cacheStore.invalidateOrgScopes(newOrgId)
    }

    // Persist to localStorage
    if (newOrgId) {
      try {
        localStorage.setItem("activeOrgId", newOrgId)
      } catch (e) {
        console.warn("[v0] Failed to save activeOrgId to localStorage", e)
      }
    } else {
      try {
        localStorage.removeItem("activeOrgId")
      } catch (e) {
        console.warn("[v0] Failed to clear activeOrgId from localStorage", e)
      }
    }
  }

  const value: PermissionsContextType = {
    userId,
    profile,
    permissions,
    activeOrgId,
    setActiveOrgId,
    isLoading,
    error,
    isActiveOrgValid,
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
 * Uses unified permission actions from lib/rbac.ts
 */
export function useCanAccess(
  action: string,
  scope?: { orgId?: string; eventId?: string }
) {
  const { permissions } = usePermissions()

  if (!permissions) return false

  const { hasPermission } = require("@/lib/rbac")
  return hasPermission(permissions, action, scope)
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
