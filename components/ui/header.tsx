"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Ticket } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { clearDemoSession, getDemoSession } from "@/lib/demo-auth"
import { useAuth } from "@/lib/providers/auth-context"

interface HeaderProps {
  user?: { email?: string }
  onLogout?: () => void
}

export function Header({ user, onLogout }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createClient(), [])
  const auth = useAuth()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Use auth context if available, fall back to user prop
  const isLoggedIn = auth.isLoggedIn || !!user
  const userEmail = auth.email || user?.email
  const userRole = auth.role

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const handleCreateEventClick = () => {
    if (!isLoggedIn) {
      router.push("/signup?type=organizer&from=create-event")
      return
    }
    // If logged in organizer, go to create event
    if (userRole === "organizer") {
      router.push("/orgs/new")
    } else {
      // Attendees need to complete organizer setup
      router.push("/create")
    }
  }

  const navItems = [
    { href: "/browse", label: "Browse Events" },
    { href: "/host", label: "Host an Event" },
    { href: "/app/tickets", label: "My Tickets", showFor: ["attendee", "organizer"] as UserRole[] },
    { href: "/orgs", label: "Dashboard", showFor: ["organizer"] as UserRole[] },
  ]

  const handleLogout = async () => {
    if (onLogout) {
      onLogout()
      return
    }

    // Use the sign-out API route (sets cookies properly via server action)
    await fetch("/api/sign-out", { method: "POST" })
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-[980px] mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold text-primary">Ticketiv</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            // Show items based on user role
            if (item.showFor && !item.showFor.includes(userRole)) return null
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-foreground/80"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-sm text-muted-foreground hidden lg:inline">{userEmail}</span>
              <Button size="sm" variant="default" onClick={handleCreateEventClick}>
                Create Event
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" variant="default" onClick={handleCreateEventClick}>
                Create Event
              </Button>
            </>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-card">
          <nav className="max-w-[980px] mx-auto px-4 py-4 space-y-3">
            {navItems.map((item) => {
              if (item.showFor && !item.showFor.includes(userRole)) return null
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block py-2 text-base font-medium transition-colors hover:text-primary ${
                    isActive ? "text-primary" : "text-foreground/80"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}
            {isLoggedIn ? (
              <div className="pt-3 border-t space-y-3">
                <span className="text-sm text-muted-foreground block">{userEmail}</span>
                <Button size="sm" variant="default" onClick={handleCreateEventClick} className="w-full">
                  Create Event
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full">
                  Logout
                </Button>
              </div>
            ) : (
              <div className="pt-3 border-t space-y-3">
                <Button variant="ghost" size="sm" asChild className="w-full">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" variant="default" onClick={handleCreateEventClick} className="w-full">
                  Create Event
                </Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

type UserRole = "guest" | "attendee" | "organizer"
