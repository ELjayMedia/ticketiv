"use client"

import { usePermissions } from "@/lib/providers/permissions-provider"
import { cacheStore } from "@/lib/cache-store"

/**
 * Hook for using org-scoped cache
 * Automatically uses activeOrgId as cache context
 *
 * Example:
 * const { get, set } = useOrgScopedCache()
 * const events = get<Event[]>("events-list") || await fetchEvents()
 * set("events-list", events)
 */
export function useOrgScopedCache() {
  const { activeOrgId } = usePermissions()

  return {
    get<T>(key: string): T | null {
      return cacheStore.get<T>(key, activeOrgId)
    },
    set<T>(key: string, data: T): void {
      cacheStore.set(key, data, activeOrgId)
    },
  }
}
