import Link from "next/link";
import { Button } from "@/components/quiet/ui/button";
import { Icon } from "@/components/quiet/ui/icon";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function NotFound() {
  const userSession = await getCurrentUserProfile();
  const isAuthenticated = !!userSession?.profile;

  const dashboardLink = "/app/tickets";
  const dashboardLabel = "View my tickets";

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-10 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">
              T
            </span>
            <span className="text-[15px] font-semibold tracking-tight">ticketiv</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-xl text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.02em] text-ink-3">
            404 · Not found
          </p>
          <h1 className="mt-3 text-h1 text-ink">Page not found</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
            We couldn&apos;t find the page you&apos;re looking for. It may have moved, or never existed.
          </p>

          <form action="/browse" method="get" className="mx-auto mt-8 max-w-md">
            <label
              htmlFor="not-found-search"
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line-2 bg-surface px-3 py-2.5 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft"
            >
              <Icon name="search" size={16} className="text-ink-3" />
              <input
                id="not-found-search"
                type="search"
                name="q"
                placeholder="Search for events"
                aria-label="Search for events"
                className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-ink-4"
              />
            </label>
          </form>

          <div className="mt-8 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link href="/browse">
              <Button variant="accent" size="md">
                <Icon name="search" size={14} />
                Browse events
              </Button>
            </Link>

            {isAuthenticated && (
              <Link href={dashboardLink}>
                <Button variant="outline" size="md">
                  <Icon name="ticket" size={14} />
                  {dashboardLabel}
                </Button>
              </Link>
            )}
          </div>

          <p className="mt-8 text-[13px] text-ink-3">
            Need help?{" "}
            <Link href="/help" className="text-ink underline decoration-line-2 underline-offset-4 hover:decoration-accent">
              Visit the help center
            </Link>{" "}
            or{" "}
            <Link href="/support" className="text-ink underline decoration-line-2 underline-offset-4 hover:decoration-accent">
              contact support
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
