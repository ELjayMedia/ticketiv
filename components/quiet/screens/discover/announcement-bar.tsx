"use client";

import * as React from "react";
import { Icon } from "@/components/quiet/ui/icon";

const DISMISS_KEY = "ticketiv:home-announcement-dismissed";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    // Storage can be unavailable (private mode); the bar simply stays.
    return false;
  }
}

/** Slim, dismissible brand strip above the desktop Discover hero. */
export function AnnouncementBar({ children }: { children: React.ReactNode }) {
  // Server render (and the first client pass) show the bar; a stored
  // dismissal hides it after hydration without a mismatch.
  const storedDismissal = React.useSyncExternalStore(() => () => {}, readDismissed, () => false);
  const [dismissedNow, setDismissedNow] = React.useState(false);

  if (storedDismissal || dismissedNow) return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-[var(--radius-md)] bg-accent px-4 py-2 text-white">
      <p className="flex-1 text-center text-[13px] font-medium">{children}</p>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={() => {
          setDismissedNow(true);
          try {
            window.localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // Dismissal just won't persist.
          }
        }}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/80 hover:bg-white/15 hover:text-white"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
