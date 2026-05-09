"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/ui/app-shell"
import { Spinner } from "@/components/ui/spinner"
import type { WorkspaceType } from "@/lib/navigation"
import { createClient } from "@/lib/supabase"
import { getDemoSession, clearDemoSession } from "@/lib/demo-auth"

interface WorkspaceShellProps {
  workspace: WorkspaceType
  children: React.ReactNode
  requireAuth?: boolean
}

export function WorkspaceShell({ workspace, children, requireAuth = false }: WorkspaceShellProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(requireAuth)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadSession() {
      try {
        const demoUser = getDemoSession()
        if (demoUser) {
          console.log("[v0] Demo session found:", demoUser.email)
          if (active) {
            setUser({ email: demoUser.email })
            setLoading(false)
          }
          return
        }

        if (!supabase) {
          if (active) {
            setLoading(false)
            if (requireAuth) {
              router.push("/login")
            }
          }
          return
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("[v0] Failed to retrieve session:", sessionError.message)
          if (active) {
            setError("Failed to load authentication session")
            setLoading(false)
          }
          return
        }

        if (!session && requireAuth) {
          router.push("/login")
        }

        if (active) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (err) {
        console.error("[v0] Unexpected error loading session:", err)
        if (active) {
          setError("An unexpected error occurred")
          setLoading(false)
        }
      }
    }

    loadSession()

    if (supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return
        setUser(session?.user ?? null)
        if (!session && requireAuth) {
          const demoUser = getDemoSession()
          if (!demoUser) {
            router.push("/login")
          }
        }
      })

      return () => {
        active = false
        listener?.subscription.unsubscribe()
      }
    }

    return () => {
      active = false
    }
  }, [requireAuth, router, supabase])

  const handleLogout = async () => {
    const demoUser = getDemoSession()
    if (demoUser) {
      clearDemoSession()
      router.push("/login")
      return
    }

    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error("[v0] Failed to sign out:", error.message)
      }
    } else {
      router.push("/login")
    }
  }

  if (requireAuth && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (requireAuth && !loading && !user) {
    return null
  }

  if (error && requireAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-destructive hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <AppShell user={user ?? undefined} workspace={workspace} onLogout={handleLogout}>
      <div className="w-full px-4 sm:px-6 lg:px-0 py-0">{children}</div>
    </AppShell>
  )
}
