"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Ticket } from "lucide-react"
import { createClient } from "@/lib/supabase"

interface HeaderProps {
  user?: any
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      router.push("/login")
      router.refresh()
    }
  }

  if (!mounted) return null

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/browse" className="flex items-center gap-2">
          <Ticket className="w-6 h-6 text-primary" />
          <span className="text-2xl font-bold text-primary">Ticketiv</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/browse" className="text-sm font-medium hover:text-primary transition">
            Browse Events
          </Link>
          <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition">
            My Tickets
          </Link>
          {user && <span className="text-sm text-muted-foreground">{user.email}</span>}
        </nav>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </header>
  )
}
