"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/quiet/ui/icon";
import { formatPriceLabel, formatVenueLabel, type Currency } from "@/lib/format";
import { createClient } from "@/lib/supabase";
import posthog from "posthog-js";

const ALLOWED_CURRENCIES: ReadonlySet<Currency> = new Set<Currency>([
  "SZL",
  "ZAR",
  "USD",
  "EUR",
  "GBP",
]);

function toCurrency(raw: string | null | undefined): Currency {
  if (raw && ALLOWED_CURRENCIES.has(raw as Currency)) return raw as Currency;
  return "SZL";
}

/* ──────────────────────────────────────────────────────────────
 * Global search overlay
 *
 * Invokable from any screen via the `useSearchOverlay()` hook or the
 * ⌘K / Ctrl+K shortcut. Desktop renders a centered ~640px dialog,
 * mobile a full-height sheet. Empty state shows recent searches
 * (localStorage) + popular categories; typing triggers a debounced
 * suggest call against /api/search/suggest.
 *
 * State lives in <SearchOverlayProvider> mounted at the root layout
 * so the same dialog is reused from any trigger.
 * ────────────────────────────────────────────────────────────── */

const RECENT_KEY = "ticketiv:recent-searches";
const RECENT_MAX = 6;

const POPULAR: ReadonlyArray<{ label: string; href: string; icon: "music" | "fire" | "users" | "ticket" | "spark" | "heart" }> = [
  { label: "Music", href: "/search?category=Music", icon: "music" },
  { label: "Comedy", href: "/search?category=Comedy", icon: "fire" },
  { label: "Workshops", href: "/search?category=Workshop", icon: "users" },
  { label: "Theatre", href: "/search?category=Theatre", icon: "ticket" },
  { label: "Festivals", href: "/search?category=Festival", icon: "spark" },
  { label: "Free events", href: "/search?onlyFree=1", icon: "heart" },
];

interface SuggestEvent {
  id: string;
  slug: string | null;
  title: string;
  cover: string | null;
  when: string | null;
  venue: string | null;
  city: string | null;
  category: string | null;
  minPriceCents: number | null;
  currency: string | null;
}

interface SearchOverlayContextValue {
  open: () => void;
  close: () => void;
  isOpen: boolean;
}

const SearchOverlayContext = React.createContext<SearchOverlayContextValue | null>(null);

export function useSearchOverlay(): SearchOverlayContextValue {
  const ctx = React.useContext(SearchOverlayContext);
  if (!ctx) {
    // Safe no-op outside the provider so server-rendered triggers don't crash.
    return { open: () => {}, close: () => {}, isOpen: false };
  }
  return ctx;
}

export function SearchOverlayProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const identifiedUserId = React.useRef<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let active = true;

    const synchronizeIdentity = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!active) return;

      if (!user) {
        if (identifiedUserId.current) {
          posthog.reset();
          identifiedUserId.current = null;
        }
        return;
      }

      if (identifiedUserId.current === user.id) return;
      if (identifiedUserId.current) posthog.reset();

      const displayName = typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : undefined;

      posthog.identify(user.id, {
        email: user.email ?? undefined,
        name: displayName,
      });
      identifiedUserId.current = user.id;
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      synchronizeIdentity(session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      synchronizeIdentity(session?.user ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Global ⌘K / Ctrl+K shortcut.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isK = e.key === "k" || e.key === "K";
      if (isK && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <SearchOverlayContext.Provider value={{ open, close, isOpen }}>
      {children}
      {isOpen && <SearchOverlay onClose={close} />}
    </SearchOverlayContext.Provider>
  );
}

/* ── The overlay itself ─────────────────────────────────────── */

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [results, setResults] = React.useState<SuggestEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recent, setRecent] = React.useState<string[]>([]);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage on mount.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter((s): s is string => typeof s === "string").slice(0, RECENT_MAX));
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, []);

  // Focus on open + lock body scroll. Escape closes.
  React.useEffect(() => {
    inputRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Debounce the query before hitting the suggest endpoint.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch suggestions. We deliberately ignore stale responses by
  // checking the inflight query against the latest debounced query.
  React.useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQuery)}`, {
      headers: { accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: { events?: SuggestEvent[] }) => {
        if (cancelled) return;
        setResults(Array.isArray(data.events) ? data.events : []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResults([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Reset highlight whenever the result list changes.
  React.useEffect(() => {
    setActiveIndex(-1);
  }, [results, debouncedQuery]);

  const persistRecent = React.useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setRecent((prev) => {
        const next = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(
          0,
          RECENT_MAX,
        );
        try {
          window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          // ignore quota / private-mode errors
        }
        return next;
      });
    },
    [],
  );

  const clearRecent = React.useCallback(() => {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  }, []);

  const navigateTo = React.useCallback(
    (href: string, recentTerm?: string) => {
      if (recentTerm) persistRecent(recentTerm);
      onClose();
      router.push(href);
    },
    [onClose, persistRecent, router],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = query.trim();
    if (activeIndex >= 0 && activeIndex < results.length) {
      const r = results[activeIndex];
      navigateTo(`/events/${r.slug ?? r.id}`, term || r.title);
      return;
    }
    if (term) {
      navigateTo(`/search?q=${encodeURIComponent(term)}`, term);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  };

  const showEmptyState = debouncedQuery.length < 2;
  const hasNoMatches =
    !loading && !showEmptyState && results.length === 0 && debouncedQuery.length >= 2;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search Ticketiv"
      className="fixed inset-0 z-[60] flex flex-col bg-ink/40 sm:items-start sm:justify-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-surface shadow-[var(--shadow-elev)] sm:mx-auto sm:mt-[10vh] sm:h-auto sm:max-h-[80vh] sm:max-w-[640px] sm:rounded-[var(--radius-lg)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input bar */}
        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2.5 border-b border-line px-4 py-3 sm:px-5"
        >
          <Icon name="search" size={18} className="shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search events, artists, venues…"
            aria-label="Search Ticketiv"
            className="flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-ink-3"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear"
              className="text-ink-3 hover:text-ink"
            >
              <Icon name="close" size={14} />
            </button>
          )}
          <span className="hidden rounded border border-line bg-bg px-1.5 font-mono text-[10px] text-ink-3 sm:inline">
            esc
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-line/60 sm:hidden"
          >
            <Icon name="close" size={18} />
          </button>
        </form>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {showEmptyState && (
            <EmptyState
              recent={recent}
              onPickRecent={(term) => {
                setQuery(term);
                inputRef.current?.focus();
              }}
              onClearRecent={clearRecent}
              onNavigate={(href) => navigateTo(href)}
            />
          )}

          {!showEmptyState && loading && (
            <p className="px-1 py-6 text-center font-mono text-[11px] text-ink-3">
              Searching…
            </p>
          )}

          {!showEmptyState && !loading && hasNoMatches && (
            <NoMatches query={debouncedQuery} onNavigate={(href) => navigateTo(href)} />
          )}

          {!showEmptyState && !loading && results.length > 0 && (
            <ResultsList
              results={results}
              activeIndex={activeIndex}
              query={debouncedQuery}
              onNavigate={(href, term) => navigateTo(href, term)}
              onHover={setActiveIndex}
            />
          )}
        </div>

        {/* Footer hint */}
        <div className="hidden items-center gap-3 border-t border-line bg-bg px-5 py-2 font-mono text-[10px] text-ink-3 sm:flex">
          <span className="inline-flex items-center gap-1">
            <KeyChip>↵</KeyChip> open
          </span>
          <span className="inline-flex items-center gap-1">
            <KeyChip>↑</KeyChip>
            <KeyChip>↓</KeyChip> navigate
          </span>
          <span className="inline-flex items-center gap-1">
            <KeyChip>esc</KeyChip> close
          </span>
          <span className="flex-1" />
          <Link
            href="/search"
            onClick={onClose}
            className="text-accent hover:underline"
          >
            View all filters →
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  recent,
  onPickRecent,
  onClearRecent,
  onNavigate,
}: {
  recent: string[];
  onPickRecent: (term: string) => void;
  onClearRecent: () => void;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5 py-2">
      {recent.length > 0 && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-label">Recent</span>
            <button
              type="button"
              onClick={onClearRecent}
              className="font-mono text-[10px] text-ink-3 hover:text-ink"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onPickRecent(term)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-3 py-1.5 text-[12px] font-semibold hover:border-line-2"
              >
                <Icon name="cal" size={11} className="text-ink-3" />
                {term}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="text-label mb-2">Popular categories</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {POPULAR.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onNavigate(p.href)}
              className="flex items-center gap-2 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2 text-left text-[13px] font-medium hover:border-line-2"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name={p.icon} size={13} />
              </span>
              <span className="flex-1">{p.label}</span>
              <Icon name="chevR" size={12} className="text-ink-3" />
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="text-label mb-2">Quick filters</div>
        <div className="flex flex-wrap gap-1.5">
          <QuickFilter href="/search?when=tonight" label="Tonight" onNavigate={onNavigate} />
          <QuickFilter href="/search?when=weekend" label="This weekend" onNavigate={onNavigate} />
          <QuickFilter href="/search?when=week" label="This week" onNavigate={onNavigate} />
          <QuickFilter href="/search?onlyFree=1" label="Free only" onNavigate={onNavigate} />
          <QuickFilter href="/search?maxPriceCents=50000" label="Under E500" onNavigate={onNavigate} />
        </div>
      </section>
    </div>
  );
}

function QuickFilter({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold hover:border-line-2"
    >
      {label}
    </button>
  );
}

function NoMatches({
  query,
  onNavigate,
}: {
  query: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icon name="search" size={16} />
      </div>
      <div>
        <div className="text-[14px] font-semibold">No matches for "{query}"</div>
        <p className="mt-1 text-[12px] text-ink-3">
          Try a different keyword or browse a category.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {POPULAR.slice(0, 4).map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onNavigate(p.href)}
            className="rounded-full border border-line bg-bg px-3 py-1.5 text-[12px] font-semibold hover:border-line-2"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultsList({
  results,
  activeIndex,
  query,
  onNavigate,
  onHover,
}: {
  results: SuggestEvent[];
  activeIndex: number;
  query: string;
  onNavigate: (href: string, recentTerm?: string) => void;
  onHover: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-label mb-1">Events</div>
      {results.map((r, i) => {
        const active = i === activeIndex;
        const href = `/events/${r.slug ?? r.id}`;
        const venue = formatVenueLabel(r.venue ?? r.city);
        const price = formatPriceLabel(r.minPriceCents, toCurrency(r.currency));
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onNavigate(href, r.title)}
            onMouseEnter={() => onHover(i)}
            className={
              "flex w-full items-center gap-3 rounded-[var(--radius-md)] border px-2 py-2 text-left transition-colors " +
              (active ? "border-line-2 bg-bg" : "border-transparent hover:bg-bg")
            }
          >
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[var(--radius)] bg-line">
              {r.cover && (
                <img
                  src={r.cover}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[14px] font-semibold">
                {highlightMatch(r.title, query)}
              </span>
              <span className="truncate font-mono text-[11px] text-ink-3">
                {[r.category, venue].filter(Boolean).join(" · ")}
              </span>
            </div>
            <span className="font-mono text-[12px] font-semibold text-ink-3">{price}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onNavigate(`/search?q=${encodeURIComponent(query)}`, query)}
        className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-line px-3 py-2 text-[12px] font-semibold hover:bg-bg"
      >
        See all results for "{query}" <Icon name="arrowR" size={12} />
      </button>
    </div>
  );
}

function KeyChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-line bg-surface px-1 text-[10px]">
      {children}
    </span>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-accent-soft text-accent">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

/* ──────────────────────────────────────────────────────────────
 * SearchTrigger — renders children and opens the overlay on click.
 *
 * The trigger is rendered as a real <button> by default so it works
 * without the overlay context (e.g. a screen-reader-only path). The
 * caller may pass `fallbackHref` for the no-JS / context-less case
 * to render an anchor instead, navigating to /search the old way.
 * ────────────────────────────────────────────────────────────── */

interface SearchTriggerProps extends React.HTMLAttributes<HTMLElement> {
  fallbackHref?: string;
  children: React.ReactNode;
}

export function SearchTrigger({
  fallbackHref = "/search",
  children,
  onClick,
  className,
  ...rest
}: SearchTriggerProps) {
  const { open } = useSearchOverlay();
  return (
    <a
      href={fallbackHref}
      className={className}
      onClick={(e) => {
        // Let middle-click / cmd-click open /search in a new tab.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        open();
        onClick?.(e as unknown as React.MouseEvent<HTMLElement>);
      }}
      {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
    >
      {children}
    </a>
  );
}
