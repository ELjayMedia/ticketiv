"use client"

import * as React from "react"
import posthog from "posthog-js"

import { createClient } from "@/lib/supabase"

/**
 * Keeps PostHog's identity in step with the Supabase session.
 *
 * This lives in its own component, mounted from the root layout, rather than
 * inside SearchOverlayProvider where it started. Global auth-to-analytics
 * identity has nothing to do with the search UI, and coupling them means
 * identity silently stops the day that provider is moved, removed, or absent
 * from a route tree — a failure nobody would notice, because the events keep
 * arriving, just anonymous.
 *
 * Identity is the user's UUID only. Email and display name are deliberately not
 * sent: the id is enough to build every funnel, anything richer can be joined
 * from our own database, and it keeps buyer PII out of a third-party processor.
 * If person profiles in PostHog need to show an email later, that is a data
 * protection decision to take on purpose, not a default.
 */
export function PostHogIdentity() {
  const identifiedUserId = React.useRef<string | null>(null)

  React.useEffect(() => {
    const supabase = createClient()
    if (!supabase) return

    let active = true

    const synchronizeIdentity = (userId: string | null) => {
      if (!active) return

      if (!userId) {
        if (identifiedUserId.current) {
          posthog.reset()
          identifiedUserId.current = null
        }
        return
      }

      if (identifiedUserId.current === userId) return
      // A different user on the same browser: clear the previous identity so
      // their events are not merged into one person.
      if (identifiedUserId.current) posthog.reset()

      posthog.identify(userId)
      identifiedUserId.current = userId
    }

    void supabase.auth
      .getSession()
      .then(({ data: { session } }) => synchronizeIdentity(session?.user?.id ?? null))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      synchronizeIdentity(session?.user?.id ?? null)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return null
}
