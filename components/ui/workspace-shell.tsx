"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Header } from "@/components/ui/header"
import { Spinner } from "@/components/ui/spinner"
import type { WorkspaceType } from "@/lib/navigation"

interface WorkspaceShellProps {
  workspace: WorkspaceType
  children: React.ReactNode
  requireAuth?: boolean
}

export function WorkspaceShell({ workspace, children, requireAuth = false }: WorkspaceShellProps) {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [loading, setLoading] = useState(requireAuth)

  useEffect(() => {
    if (!requireAuth) {
      return
    }

    const userStr = localStorage.getItem("ticketiv_user")
    if (!userStr) {
      setLoading(false)
      router.push("/login")
      return
    }

    try {
      const parsed = JSON.parse(userStr)
      setUser(parsed)
    } catch (error) {
      console.error("Failed to parse stored user", error)
    } finally {
      setLoading(false)
    }
  }, [requireAuth, router])

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
