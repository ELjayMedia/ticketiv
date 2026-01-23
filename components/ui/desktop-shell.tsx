"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  TicketIcon,
  Calendar,
  User,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Building2,
  LayoutDashboard,
  Users,
  ScanLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"

interface DesktopShellProps {
  children: React.ReactNode
  user?: { email?: string }
  workspace: "public" | "app" | "organizer" | "scanner"
  onLogout?: () => void
}

export function DesktopShell({ children, user, workspace, onLogout }: DesktopShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const navigation = {
    public: [
      { href: "/", label: "Home", icon: Home, shortcut: "H" },
      { href: "/browse", label: "Events", icon: Calendar, shortcut: "E" },
      { href: "/organisers", label: "Organisers", icon: Building2, shortcut: "O" },
      { href: "/artists", label: "Artists", icon: Users, shortcut: "A" },
    ],
    app: [
      { href: "/app/home", label: "Home", icon: Home, shortcut: "H" },
      { href: "/browse", label: "Explore", icon: Search, shortcut: "E" },
      { href: "/app/tickets", label: "My Tickets", icon: TicketIcon, shortcut: "T" },
      { href: "/payments", label: "Payments", icon: Settings, shortcut: "P" },
    ],
    organizer: [
      { href: "/dashboard", label: "Dashboard", icon: Home, shortcut: "D" },
      { href: "/events", label: "Events", icon: Calendar, shortcut: "E" },
      { href: "/payments", label: "Payments", icon: Settings, shortcut: "P" },
    ],
    scanner: [
      { href: "/scan", label: "Scan Tickets", icon: TicketIcon, shortcut: "S" },
      { href: "/dashboard", label: "Dashboard", icon: Home, shortcut: "D" },
    ],
  }

  const currentNav = navigation[workspace] || navigation.public

  const organizations = [
    { id: "org_1", name: "My Organization", role: "Owner" },
    { id: "org_2", name: "Tech Events Inc", role: "Admin" },
  ]
  const [currentOrg, setCurrentOrg] = useState(organizations[0])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="hidden lg:flex lg:flex-col min-h-screen">
      <header className="h-16 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-40">
        <div className="flex items-center justify-between h-full px-6 gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary rounded flex-shrink-0"
          >
            <TicketIcon className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-primary">Ticketiv</span>
          </Link>

          <nav className="flex items-center gap-1" role="navigation" aria-label="Main navigation">
            {currentNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"))
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                  title={`${item.label} (${item.shortcut})`}
                  aria-label={`${item.label} (Keyboard shortcut: ${item.shortcut})`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Search - Only show for non-public workspace */}
          {workspace !== "public" && (
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  placeholder="Search events, organisers, artists…"
                  className="pl-9 focus:ring-2 focus:ring-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search"
                />
              </div>
            </form>
          )}

          <div className="flex items-center gap-2">
            {/* Organization Switcher */}
            {workspace === "organizer" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 focus:ring-2 focus:ring-primary bg-transparent"
                    aria-label="Switch organization"
                  >
                    <Building2 className="h-4 w-4" aria-hidden="true" />
                    <span className="max-w-[150px] truncate">{currentOrg.name}</span>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[250px]">
                  <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      onClick={() => setCurrentOrg(org)}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">{org.role}</p>
                      </div>
                      {currentOrg.id === org.id && <Badge variant="secondary">Active</Badge>}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/organizations/new">Create Organization</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Notifications */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative focus:ring-2 focus:ring-primary"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" aria-hidden="true" />
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      3
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[350px]">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <div>
                      <p className="font-medium">New ticket sale</p>
                      <p className="text-xs text-muted-foreground">2 tickets sold for Summer Festival</p>
                      <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div>
                      <p className="font-medium">Event starting soon</p>
                      <p className="text-xs text-muted-foreground">Tech Conference starts in 24 hours</p>
                      <p className="text-xs text-muted-foreground mt-1">5 hours ago</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <div>
                      <p className="font-medium">Payment received</p>
                      <p className="text-xs text-muted-foreground">$250.00 deposited to your account</p>
                      <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/notifications">View all notifications</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Profile Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 focus:ring-2 focus:ring-primary" aria-label="User menu">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[150px] truncate text-sm">{user.email}</span>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="h-4 w-4 mr-2" aria-hidden="true" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                      Settings
                    </Link>
                  </DropdownMenuItem>

                  {workspace === "organizer" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Organizer Tools</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                          <LayoutDashboard className="h-4 w-4 mr-2" aria-hidden="true" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/events">
                          <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                          Manage Events
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/events?tab=orders">
                          <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                          Orders & Guests
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/scan">
                          <ScanLine className="h-4 w-4 mr-2" aria-hidden="true" />
                          Scanner
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content with route outlet */}
      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-0 py-0">
        <div
          className="fixed inset-0 top-16 -z-10 opacity-0 transition-opacity duration-500"
          id="desktop-shell-bg"
          style={{
            backgroundImage: "var(--page-bg-image, none)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(80px) brightness(0.4)",
          }}
        />
        <div
          className="fixed inset-0 top-16 -z-10 bg-gradient-to-b from-background/95 via-background/80 to-background/95"
          aria-hidden="true"
        />
        {children}
      </main>
    </div>
  )
}
