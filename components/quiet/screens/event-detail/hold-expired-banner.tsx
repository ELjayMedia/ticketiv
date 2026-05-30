"use client";

import * as React from "react";

export function HoldExpiredBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  if (dismissed) return null;
  return (
    <div
      role="alert"
      className="bg-danger/10 border-b border-danger/20 px-5 py-2.5 text-[13px] text-danger flex items-center justify-between"
    >
      <span>Your reservation expired — select tickets again to continue.</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="ml-4 shrink-0 hover:opacity-70"
      >
        ✕
      </button>
    </div>
  );
}
