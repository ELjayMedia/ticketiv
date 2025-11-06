"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Spinner } from "@/components/ui/spinner"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userStr = localStorage.getItem("ticketiv_user")
    if (!userStr) {
      router.push("/login")
    } else {
      setUser(JSON.parse(userStr))
    }
    setLoading(false)
  }, [router])

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
