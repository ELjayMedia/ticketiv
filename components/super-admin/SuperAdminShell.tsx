import Link from "next/link"

import { signOutSuperAdminAction } from "@/app/super-admin/actions"
import { Button } from "@/components/quiet/ui/button"
import { Icon } from "@/components/quiet/ui/icon"
import { AdminNav } from "@/components/super-admin/AdminNav"
import { navForRole } from "@/components/super-admin/admin-nav"
import { ADMIN_ROLE_LABELS, type AdminRoleTier } from "@/lib/super-admin/console"

/**
 * Admin console frame: navigation grouped by job, one search box, and a
 * reminder when payments run on test keys. Pages bring their own breadcrumbs.
 */
export function SuperAdminShell({
  children,
  userEmail,
  role,
  paymentsTestMode = false,
}: {
  children: React.ReactNode
  userEmail?: string | null
  role?: AdminRoleTier | null
  paymentsTestMode?: boolean
}) {
  const groups = navForRole(role)
  const roleLabel = role ? `${ADMIN_ROLE_LABELS[role]} · ${role}` : "Admin"
  const canWorkCases = role === "super_admin" || role === "support_admin"

  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/super-admin" className="flex items-center gap-3 px-5 pb-4 pt-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-surface">T</span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-ink">Ticketiv</span>
            <span className="text-xs text-ink-3">Admin console</span>
          </span>
        </Link>

        <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3 pb-4">
          <AdminNav groups={groups} />
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="user" className="h-4 w-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-ink">{userEmail ?? "Admin"}</span>
              <span className="truncate text-xs text-ink-3">{roleLabel}</span>
            </span>
          </div>
          <form action={signOutSuperAdminAction} className="mt-2">
            <Button type="submit" variant="ghost" size="sm" block className="justify-start">
              <Icon name="logout" className="h-3.5 w-3.5" /> Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-surface/90 backdrop-blur supports-[backdrop-filter]:bg-surface/75">
          <div className="flex min-h-16 flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <details className="group relative lg:hidden">
              <summary
                className="inline-flex size-10 cursor-pointer list-none items-center justify-center rounded-full border border-line-2 bg-surface hover:bg-surface-2 [&::-webkit-details-marker]:hidden"
                aria-label="Open admin navigation"
              >
                <Icon name="menu" className="h-4 w-4" />
              </summary>
              <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-surface p-4 shadow-lg">
                <AdminNav groups={groups} />
                <form action={signOutSuperAdminAction} className="mt-4 border-t border-line pt-4">
                  <Button type="submit" variant="outline" size="sm" block>
                    <Icon name="logout" className="h-3.5 w-3.5" /> Sign out
                  </Button>
                </form>
              </div>
            </details>

            <form
              action="/super-admin/search"
              method="get"
              role="search"
              className="order-last flex min-w-0 basis-full items-center gap-2 rounded-full border border-line-2 bg-surface px-3 text-sm text-ink-3 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft sm:order-none sm:max-w-md sm:flex-1 sm:basis-auto"
            >
              <Icon name="search" className="h-4 w-4 shrink-0" />
              <label htmlFor="shell-search" className="sr-only">
                Search people, orders and PAY- references
              </label>
              <input
                id="shell-search"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="Search people, orders or a PAY- reference"
                className="h-10 w-full min-w-0 bg-transparent text-ink outline-none placeholder:text-ink-3"
              />
            </form>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              {paymentsTestMode ? (
                <span className="inline-flex items-center rounded-full bg-warning-soft px-3 py-1.5 text-xs font-semibold text-warning">
                  Payments in test mode
                </span>
              ) : null}
              {canWorkCases ? (
                <Link
                  href="/super-admin/cases"
                  className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-3 text-sm font-semibold text-ink hover:bg-bg"
                >
                  <Icon name="bell" className="h-4 w-4" /> Cases
                </Link>
              ) : null}
              <Link
                href="/orgs"
                className="inline-flex min-h-10 items-center rounded-[var(--radius)] px-3 text-sm font-medium text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                Organizer workspace
              </Link>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
