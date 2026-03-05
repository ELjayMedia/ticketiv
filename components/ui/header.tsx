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

  // Primary navigation - always visible
  const primaryNavItems = [
    { href: "/", label: "Home" },
    { href: "/browse", label: "Browse Events" },
    { href: "/host", label: "Organisers" },
  ]

  // Secondary navigation - role-based
  const secondaryNavItems = []
  if (isLoggedIn) {
    if (userRole === "attendee") {
      secondaryNavItems.push({ href: "/app/tickets", label: "My Tickets" })
    } else if (userRole === "organizer") {
      secondaryNavItems.push({ href: "/orgs", label: "Dashboard" })
      secondaryNavItems.push({ href: "/org/events", label: "Events" })
    }
  }

  const handleLogout = async () => {
    if (onLogout) {
      onLogout()
      return
    }

    const demoUser = getDemoSession()
    if (demoUser) {
      clearDemoSession()
      router.push("/login")
      return
    }

    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-[980px] mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          <span className="text-2xl font-bold text-primary">Ticketiv</span>
        </Link>

        {/* Desktop Primary Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {primaryNavItems.map((item) => {
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

        {/* Right Side: Secondary Nav + Auth */}
        <div className="flex items-center gap-3">
          {/* Desktop Secondary Navigation */}
          {isLoggedIn && secondaryNavItems.length > 0 && (
            <nav className="hidden md:flex items-center gap-4 border-l border-border/40 pl-4">
              {secondaryNavItems.map((item) => {
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
          )}

          {/* Create Event Button - Always Primary CTA */}
          <Button size="sm" variant="default" onClick={handleCreateEventClick} className="hidden sm:inline-flex">
            Create Event
          </Button>

          {/* Auth Buttons */}
          {isLoggedIn ? (
            <>
              <span className="text-xs text-muted-foreground hidden lg:inline max-w-[120px] truncate">{userEmail}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-card">
          <nav className="max-w-[980px] mx-auto px-4 py-4 space-y-3">
            {/* Primary Nav Items */}
            {primaryNavItems.map((item) => {
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

            {/* Secondary Nav Items (Role-Based) */}
            {isLoggedIn && secondaryNavItems.length > 0 && (
              <>
                <div className="border-t my-3" />
                {secondaryNavItems.map((item) => {
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
              </>
            )}

            {/* Mobile Auth Section */}
            <div className="border-t mt-4 pt-4 space-y-3">
              {isLoggedIn ? (
                <>
                  <span className="text-sm text-muted-foreground block">{userEmail}</span>
                  <Button size="sm" variant="default" onClick={handleCreateEventClick} className="w-full">
                    Create Event
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full">
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild className="w-full">
                    <Link href="/login">Sign in</Link>
                  </Button>
                  <Button size="sm" variant="default" onClick={handleCreateEventClick} className="w-full">
                    Create Event
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

type UserRole = "guest" | "attendee" | "organizer"
