/**
 * Org-scoped cache store
 * Invalidates caches when org changes to prevent stale data
 */

type CacheKey = string
type CacheEntry<T> = {
  data: T
  timestamp: number
  orgId: string | null
}

const cache = new Map<CacheKey, CacheEntry<any>>()
const TTL = 5 * 60 * 1000 // 5 minutes

export const cacheStore = {
  /**
   * Get cached data if valid and still within TTL
   */
  get<T>(key: CacheKey, activeOrgId: string | null): T | null {
    const entry = cache.get(key)
    if (!entry) return null

    // Invalidate if org changed or TTL expired
    if (entry.orgId !== activeOrgId || Date.now() - entry.timestamp > TTL) {
      cache.delete(key)
      return null
    }

    return entry.data as T
  },

  /**
   * Set cached data with org scope
   */
  set<T>(key: CacheKey, data: T, activeOrgId: string | null): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      orgId: activeOrgId,
    })
  },

  /**
   * Invalidate all caches for an org
   */
  invalidateOrgScopes(orgId: string | null): void {
    if (!orgId) {
      cache.clear()
      return
    }

    const keysToDelete: CacheKey[] = []
    cache.forEach((entry, key) => {
      if (entry.orgId === orgId) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => cache.delete(key))
  },

  /**
   * Clear all caches
   */
  clear(): void {
    cache.clear()
  },
}
