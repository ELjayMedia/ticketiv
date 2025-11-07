"use client"

import type React from "react"
import type { User } from "@supabase/supabase-js"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) return

      if (!session) {
        setUser(null)
        router.push("/login")
      } else {
        setUser(session.user)
      }
      setLoading(false)
    }

    void getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        router.push("/login")
      } else {
        setUser(session.user)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <Header user={user} />
      <main className="min-h-screen bg-background">{children}</main>
    </>
  )
}
