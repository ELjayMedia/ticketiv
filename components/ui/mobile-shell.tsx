"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TicketIcon, Calendar, User, Search } from "lucide-react"
import { Header } from "@/components/ui/header"

interface MobileShellProps {
  children: React.ReactNode
  user?: { email?: string }
  workspace: "public" | "app" | "organizer" | "scanner"
}

export function MobileShell({ children, user, workspace }: MobileShellProps) {
  const pathname = usePathname()

  const isEventDetailPage = pathname.startsWith("/events/") && pathname !== "/events"
  const isCheckoutPage = pathname.startsWith("/checkout/")
  const hideBottomNav = isEventDetailPage || isCheckoutPage

  const tabs = {
    public: [
      { href: "/", label: "Home", icon: Home, ariaLabel: "Navigate to home" },
      { href: "/browse", label: "Explore", icon: Search, ariaLabel: "Explore events" },
      { href: user ? "/app/tickets" : "/login", label: "Tickets", icon: TicketIcon, ariaLabel: "View my tickets" },
    ],
    app: [
      { href: "/app/home", label: "Home", icon: Home, ariaLabel: "Navigate to home" },
      { href: "/browse", label: "Explore", icon: Search, ariaLabel: "Explore events" },
      { href: "/app/tickets", label: "My Tickets", icon: TicketIcon, ariaLabel: "View my tickets" },
      { href: "/app/profile", label: "Profile", icon: User, ariaLabel: "View profile" },
    ],
    organizer: [
      { href: "/dashboard", label: "Home", icon: Home, ariaLabel: "Navigate to dashboard" },
      { href: "/events", label: "Events", icon: Calendar, ariaLabel: "Manage events" },
      { href: "/app/profile", label: "Profile", icon: User, ariaLabel: "View profile" },
    ],
    scanner: [
      { href: "/scan", label: "Scan", icon: TicketIcon, ariaLabel: "Scan tickets" },
      { href: "/dashboard", label: "Dashboard", icon: Home, ariaLabel: "View dashboard" },
    ],
  }

  const currentTabs = tabs[workspace] || tabs.public

  return (
    <div className="flex flex-col min-h-screen lg:hidden">
      <Header user={user} />

      <main className={hideBottomNav ? "flex-1 pb-0" : "flex-1 pb-32"}>{children}</main>

      {!hideBottomNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60"
          role="navigation"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-around h-16 px-2">
            {currentTabs.map((tab) => {
              const isActive = pathname === tab.href || (tab.href !== "/" && pathname.startsWith(tab.href + "/"))
              const Icon = tab.icon
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"
                  }`}
                  aria-label={tab.ariaLabel}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
