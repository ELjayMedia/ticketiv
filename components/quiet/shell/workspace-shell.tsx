"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "@/components/quiet/ui/icon";
import { Avatar } from "@/components/quiet/ui/primitives";
import { Button } from "@/components/quiet/ui/button";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase";
import type { WorkspaceType } from "@/lib/navigation";
import { ATTENDEE_TABS } from "@/components/quiet/shell/mobile-shell";

interface NavItem {
  href: string;
  orgHref?: (orgId: string) => string;
  label: string;
  icon: IconName;
  match: (pathname: string) => boolean;
}

const WORKSPACE_NAV: Record<Extract<WorkspaceType, "organizer" | "scanner" | "app">, NavItem[]> = {
  organizer: [
    {
      href: "/events",
      orgHref: (orgId) => `/orgs/${orgId}/events`,
      label: "Events",
      icon: "cal",
      match: (p) =>
        p.startsWith("/events") ||
        /^\/orgs\/[^/]+\/(?:dashboard|events|series|pricing-plans|feature-flags)(?:\/|$)/.test(p),
    },
    {
      href: "/payouts",
      orgHref: (orgId) => `/orgs/${orgId}/payouts`,
      label: "Payouts",
      icon: "wallet",
      match: (p) => p.startsWith("/payouts") || /^\/orgs\/[^/]+\/(?:payouts|finance)(?:\/|$)/.test(p),
    },
    {
      href: "/devices",
      orgHref: (orgId) => `/orgs/${orgId}/events`,
      label: "Devices",
      icon: "qr",
      match: (p) => p.startsWith("/devices") || /^\/orgs\/[^/]+\/events\/[^/]+\/staff(?:\/|$)/.test(p),
    },
    {
      href: "/scan",
      label: "Scanner",
      icon: "check",
      match: (p) => p.startsWith("/scan"),
    },
    {
      href: "/guide",
      orgHref: (orgId) => `/orgs/${orgId}/onboarding`,
      label: "Guide",
      icon: "spark",
      match: (p) => p.startsWith("/guide") || /^\/orgs\/[^/]+\/onboarding(?:\/|$)/.test(p),
    },
  ],
  scanner: [
    {
      href: "/scan",
      label: "Scan",
      icon: "qr",
      match: (p) => p === "/scan",
    },
    {
      href: "/scan/history",
      label: "History",
      icon: "clock",
      match: (p) => p.startsWith("/scan/history"),
    },
    {
      href: "/scan/sync",
      label: "Sync",
      icon: "download",
      match: (p) => p.startsWith("/scan/sync"),
    },
    {
      href: "/scan/setup",
      label: "Setup",
      icon: "settings",
      match: (p) => p.startsWith("/scan/setup"),
    },
  ],
  app: ATTENDEE_TABS,
};

const WORKSPACE_LABEL: Record<Extract<WorkspaceType, "organizer" | "scanner" | "app">, string> = {
  organizer: "Organizer",
  scanner: "Scanner",
  app: "Attendee",
};

type ShellUser = { id?: string; email?: string; name?: string };

function getOrgIdFromPathname(pathname: string) {
  return pathname.match(/^\/orgs\/([^/]+)/)?.[1] ?? null;
}

function resolveWorkspaceHref(
  item: NavItem,
  workspace: Extract<WorkspaceType, "organizer" | "scanner" | "app">,
  pathname: string
) {
  const orgId = workspace === "organizer" ? getOrgIdFromPathname(pathname) : null;
  return orgId && item.orgHref ? item.orgHref(orgId) : item.href;
}

interface WorkspaceShellProps {
  workspace: Extract<WorkspaceType, "organizer" | "scanner" | "app">;
  children: React.ReactNode;
  requireAuth?: boolean;
}

export function WorkspaceShell({
  workspace,
  children,
  requireAuth = false,
}: WorkspaceShellProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = React.useState<ShellUser | null>(null);
  const [loading, setLoading] = React.useState(requireAuth);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        if (!supabase) {
          if (active) {
            setLoading(false);
            if (requireAuth) router.push("/login");
          }
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          if (active) {
            setError("Failed to load authentication session");
            setLoading(false);
          }
          return;
        }

        if (!session && requireAuth) router.push("/login");

        if (active) {
          if (session?.user) {
            let name: string | undefined;
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, name")
              .eq("user_id", session.user.id)
              .single();
            const fullName = profile?.display_name ?? profile?.name;
            if (fullName) {
              name = fullName.split(" ")[0];
            }
            setUser({ id: session.user.id, email: session.user.email ?? undefined, name });
          } else {
            setUser(null);
          }
          setLoading(false);
        }
      } catch {
        if (active) {
          setError("An unexpected error occurred");
          setLoading(false);
        }
      }
    }

    loadSession();

    if (supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        if (session?.user) {
          setUser((prev) => ({
            id: session.user.id,
            email: session.user.email ?? undefined,
            name: prev?.id === session.user.id ? prev.name : undefined,
          }));
        } else {
          setUser(null);
        }
        if (!session && requireAuth) router.push("/login");
      });

      return () => {
        active = false;
        listener?.subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
    };
  }, [requireAuth, router, supabase]);

  const handleLogout = React.useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      router.push("/login");
    }
  }, [router, supabase]);

  if (requireAuth && loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <span
          className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent"
          aria-label="Loading"
          role="status"
        />
      </div>
    );
  }

  if (requireAuth && !loading && !user) {
    return null;
  }

  if (error && requireAuth) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-4">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-danger bg-danger-soft p-6 text-center">
          <p className="text-[13px] text-danger">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 text-[13px] font-medium text-danger underline decoration-danger/40 underline-offset-4 hover:decoration-danger"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <OfflineStrip />

      <div className="hidden md:block">
        <DesktopWorkspaceNav
          workspace={workspace}
          user={user ?? undefined}
          onLogout={handleLogout}
        />
      </div>

      <main className="flex-1 pb-20 md:pb-12">{children}</main>

      <div className="block md:hidden">
        <MobileWorkspaceTabs workspace={workspace} />
      </div>
    </div>
  );
}

/* ── Desktop nav ─────────────────────────────────────────── */
function DesktopWorkspaceNav({
  workspace,
  user,
  onLogout,
}: {
  workspace: Extract<WorkspaceType, "organizer" | "scanner" | "app">;
  user?: ShellUser;
  onLogout: () => void;
}) {
  const pathname = usePathname() ?? "";
  const items = WORKSPACE_NAV[workspace];

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-md bg-accent text-[12px] font-bold text-white">
            T
          </span>
          <span className="text-[15px] font-semibold tracking-tight">ticketiv</span>
        </Link>

        <span className="h-4 w-px bg-line" />
        <span className="font-mono text-[11px] uppercase tracking-[0.02em] text-ink-3">
          {WORKSPACE_LABEL[workspace]}
        </span>

        <nav className="ml-4 flex items-center gap-1 text-[13px]">
          {items.map((item) => {
            const active = item.match(pathname);
            const href = resolveWorkspaceHref(item, workspace, pathname);
            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-ink-3 hover:bg-line/60 hover:text-ink"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon name={item.icon} size={14} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <span className="flex-1" />

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden max-w-[200px] truncate text-[12px] text-ink-3 lg:inline">
              {user.name ? `Hi, ${user.name}` : user.email}
            </span>
            <Avatar label={(user.name ?? user.email)?.[0]?.toUpperCase() ?? "U"} size={28} />
            <Button variant="ghost" size="xs" onClick={onLogout} aria-label="Sign out">
              <Icon name="arrowR" size={14} />
              Sign out
            </Button>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-[13px] text-ink-3 hover:text-ink"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}

/* ── Mobile bottom tabs ──────────────────────────────────── */
function MobileWorkspaceTabs({
  workspace,
}: {
  workspace: Extract<WorkspaceType, "organizer" | "scanner" | "app">;
}) {
  const pathname = usePathname() ?? "";
  const items = WORKSPACE_NAV[workspace];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-line bg-surface pt-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active = item.match(pathname);
        const href = resolveWorkspaceHref(item, workspace, pathname);
        return (
          <Link
            key={item.label}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 px-1 text-[10px] font-semibold uppercase tracking-wide",
              active ? "text-accent" : "text-ink-3"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={item.icon} size={20} strokeWidth={active ? 2 : 1.6} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Offline strip (replaces shadcn OfflineBanner) ───────── */
function OfflineStrip() {
  const [isOffline, setIsOffline] = React.useState(false);
  const [recovered, setRecovered] = React.useState(false);

  React.useEffect(() => {
    const onOnline = () => {
      setIsOffline(false);
      setRecovered(true);
      const t = setTimeout(() => setRecovered(false), 3000);
      return () => clearTimeout(t);
    };
    const onOffline = () => {
      setIsOffline(true);
      setRecovered(false);
    };
    setIsOffline(!navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!isOffline && !recovered) return null;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 border-b px-4 py-1.5 text-[12px] font-medium",
        isOffline
          ? "border-danger/30 bg-danger-soft text-danger"
          : "border-line bg-surface-2 text-ink-3"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isOffline ? "bg-danger" : "bg-success"
        )}
      />
      {isOffline ? "Offline — some features may be unavailable." : "Back online."}
    </div>
  );
}
