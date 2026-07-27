"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/quiet/ui/button";
import { Icon } from "@/components/quiet/ui/icon";

/**
 * A stale client bundle (tab opened before a deploy, navigating after it)
 * fails to fetch old chunk files and lands here with a digest-less
 * ChunkLoadError. One hard reload picks up the fresh bundle; the guard
 * cookie-less flag prevents a reload loop when the error is real.
 */
function isStaleChunkError(error: Error): boolean {
  const text = `${error.name} ${error.message}`;
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk [^ ]+ failed/i.test(text) ||
    /Failed to fetch dynamically imported module/i.test(text) ||
    /Importing a module script failed/i.test(text)
  );
}

const RELOAD_FLAG = "tk_chunk_reload";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    console.error("[ticketiv] Error boundary caught:", error);
    Sentry.captureException(error);

    if (isStaleChunkError(error)) {
      let alreadyTried = false;
      try {
        alreadyTried = sessionStorage.getItem(RELOAD_FLAG) === "1";
        if (!alreadyTried) sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        // storage unavailable — fall through to a single best-effort reload
      }
      if (!alreadyTried) {
        setReloading(true);
        window.location.reload();
      }
    } else {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // ignore
      }
    }
  }, [error]);

  if (reloading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg p-4 text-ink">
        <p className="font-mono text-[12px] uppercase tracking-wider text-ink-3">
          Updating to the latest version…
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg p-4 text-ink">
      <div className="w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-8 shadow-[var(--shadow-card)]">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
            <Icon name="close" size={24} />
          </span>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.02em] text-ink-3">
            Unexpected error
          </p>
          <h1 className="mt-2 text-h2 text-ink">Something went wrong</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
            We hit a snag rendering this page. The issue has been logged and we&apos;ll take a look.
          </p>

          {(error.digest || error.message) && (
            <div className="mt-4 w-full rounded-md border border-line bg-bg px-3 py-2 text-left">
              {error.digest && (
                <p className="font-mono text-[11px] text-ink-3">
                  Error ID: <span className="text-ink">{error.digest}</span>
                </p>
              )}
              {error.message && (
                <p className="mt-1 break-words font-mono text-[10px] leading-relaxed text-ink-3">
                  {error.name ? `${error.name}: ` : ""}
                  {error.message.slice(0, 300)}
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex w-full flex-col gap-2">
            <Button variant="accent" size="md" block onClick={reset}>
              <Icon name="arrowR" size={14} />
              Try again
            </Button>
            <Link href="/" className="w-full">
              <Button variant="outline" size="md" block>
                Go home
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-[13px] text-ink-3">
            Still stuck?{" "}
            <Link
              href="/help"
              className="text-ink underline decoration-line-2 underline-offset-4 hover:decoration-accent"
            >
              Contact support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
