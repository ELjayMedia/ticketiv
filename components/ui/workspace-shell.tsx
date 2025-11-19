"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/ui/header"
import { Spinner } from "@/components/ui/spinner"
import type { WorkspaceType } from "@/lib/navigation"
import { createClient } from "@/lib/supabase"

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

  useEffect(() => {
    let active = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session && requireAuth) {
        router.push("/login")
      }

      if (active) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    }

    loadSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      setUser(session?.user ?? null)
      if (!session && requireAuth) {
        router.push("/login")
      }
    })

    return () => {
      active = false
      listener?.subscription.unsubscribe()
    }
  }, [requireAuth, router, supabase])

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

  return (
    <>
      <Header workspace={workspace} user={user ?? undefined} />
      <main className="min-h-screen bg-background">{children}</main>
    </>
  )
}
