import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Ticket, ArrowLeft, Search, Home } from "lucide-react"
import { getCurrentUserProfile } from "@/lib/auth"

export default async function NotFound() {
  const userSession = await getCurrentUserProfile()
  const isAuthenticated = !!userSession?.profile

  const dashboardLink = userSession?.profile?.role === "organizer" ? "/dashboard" : "/app/tickets"
  const dashboardLabel = userSession?.profile?.role === "organizer" ? "Go to Dashboard" : "View My Tickets"

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with logo */}
      <header className="border-b border-border">
        <div className="container mx-auto max-w-[1200px] px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <Ticket className="h-6 w-6 text-primary" />
            <span>Ticketiv</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* 404 graphic */}
          <div className="space-y-4">
            <div className="flex justify-center gap-4 text-9xl font-bold text-muted-foreground/20">
              <span>4</span>
              <Ticket className="h-32 w-32 text-primary/20" />
              <span>4</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-balance">Page not found</h1>
            <p className="text-lg text-muted-foreground text-balance max-w-md mx-auto">
              Sorry, we couldn't find the page you're looking for. It may have been moved or no longer exists.
            </p>
          </div>

          {/* Search box */}
          <div className="max-w-md mx-auto">
            <form action="/browse" method="get" className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                name="q"
                placeholder="Search for events..."
                className="pl-10 h-12"
                aria-label="Search for events"
              />
            </form>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/browse">
                <Search className="mr-2 h-4 w-4" />
                Browse Events
              </Link>
            </Button>

            {isAuthenticated && (
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto bg-transparent">
                <Link href={dashboardLink}>
                  <Home className="mr-2 h-4 w-4" />
                  {dashboardLabel}
                </Link>
              </Button>
            )}

            <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
              <Link href="javascript:history.back()">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Link>
            </Button>
          </div>

          {/* Help text */}
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <Link href="/help" className="text-primary hover:underline">
              Visit our help center
            </Link>{" "}
            or{" "}
            <Link href="/contact" className="text-primary hover:underline">
              contact support
            </Link>
            .
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto max-w-[1200px] px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Ticketiv. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/about" className="hover:text-foreground transition-colors">
                About
              </Link>
              <Link href="/help" className="hover:text-foreground transition-colors">
                Help
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
