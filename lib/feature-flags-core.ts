// Pure rules for feature flag exclusions (no server imports, so tests and the
// admin UI can share them).

export interface FeatureScope {
  orgId?: string | null
  eventId?: string | null
}

export interface FeatureExclusion {
  orgId: string | null
  eventId: string | null
}

/**
 * Whether a feature is open for a given organisation / event.
 * An exclusion only ever closes a feature: it never opens one that is off
 * platform-wide. Excluding an organisation closes all of its events.
 */
export function featureOpenFor(platformOn: boolean, exclusions: FeatureExclusion[], scope: FeatureScope): boolean {
  if (!platformOn) return false
  for (const ex of exclusions) {
    if (ex.eventId && scope.eventId && ex.eventId === scope.eventId) return false
    if (ex.orgId && scope.orgId && ex.orgId === scope.orgId) return false
  }
  return true
}
