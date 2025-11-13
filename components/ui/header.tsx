"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Ticket } from "lucide-react"

import { getWorkspaceHome, getWorkspaceLabel, getWorkspaceNavigation, type WorkspaceType } from "@/lib/navigation"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  workspace: WorkspaceType
  user?: { email?: string }
  onLogout?: () => void
}

export function Header({ workspace, user, onLogout }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const navItems = getWorkspaceNavigation(workspace)

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
      return
    }

    if (typeof window !== "undefined") {
      localStorage.removeItem("ticketiv_user")
    }
    router.push("/login")
  }

  const showAuthActions = workspace !== "public"
  const brandHref = getWorkspaceHome(workspace)
  const workspaceLabel = getWorkspaceLabel(workspace)

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href={brandHref} className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-bold text-primary">Ticketiv</span>
            <span className="text-xs font-medium text-muted-foreground">{workspaceLabel} workspace</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          {user?.email && (
            <span className="text-sm text-muted-foreground">{user.email}</span>
          )}
        </nav>
        {showAuthActions ? (
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        ) : (
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
        )}
      </div>
    </header>
  )
}
