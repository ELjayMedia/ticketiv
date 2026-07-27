import * as React from "react";
import { cn } from "@/lib/cn";

/* ──────────────────────────────────────────────────────────────
 * iPhone-style preview shell
 * Used only on /dev/preview/* to review screens at 390×844 without
 * Chrome DevTools. Production routes render at the actual viewport.
 * ────────────────────────────────────────────────────────────── */
interface PhoneShellProps {
  time?: string;
  className?: string;
  children: React.ReactNode;
}

export function PhoneShell({
  time = "9:41",
  className,
  children,
}: PhoneShellProps) {
  return (
    <div
      className={cn(
        "relative h-[844px] w-[390px] overflow-hidden rounded-[48px] bg-bg",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_0_0_2px_#1a1815,0_0_0_6px_#2b2926,0_0_0_7px_#0a0908,0_40px_80px_-10px_rgba(10,9,8,0.25)]",
        className
      )}
    >
      {/* Dynamic island */}
      <div className="absolute left-1/2 top-[11px] z-[50] h-[37px] w-[126px] -translate-x-1/2 rounded-3xl bg-[#0a0908]" />

      {/* Status bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-7 pt-4 font-mono text-[15px] font-semibold tabular-nums">
        <span>{time}</span>
        <div className="flex items-center gap-1.5">
          <svg width="17" height="11" viewBox="0 0 17 11">
            <path
              d="M1 9.5h2v1.5H1V9.5zm4-2h2v3.5H5V7.5zm4-2h2v5.5H9V5.5zm4-2h2v7.5h-2V3.5z"
              fill="currentColor"
            />
          </svg>
          <svg width="16" height="11" viewBox="0 0 16 11">
            <path
              d="M8 2c-3 0-5 2-7 4l2 2 5-3 5 3 2-2c-2-2-4-4-7-4z"
              fill="currentColor"
              opacity="0.85"
            />
          </svg>
          <svg width="25" height="12" viewBox="0 0 25 12">
            <rect
              x="0.5"
              y="1"
              width="20"
              height="10"
              rx="2.5"
              fill="none"
              stroke="currentColor"
            />
            <rect x="22" y="3.5" width="1.5" height="5" rx="0.5" fill="currentColor" />
            <rect x="2" y="2.5" width="17" height="7" rx="1.5" fill="currentColor" />
          </svg>
        </div>
      </div>

      <div className="flex h-full flex-col overflow-hidden bg-bg">
        {children}
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 z-30 h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-[#0a0908]" />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Browser-style preview shell — 1440×900, used on /dev/preview to
 * review desktop screens. Mimics macOS Chrome chrome.
 * ────────────────────────────────────────────────────────────── */
interface BrowserShellProps {
  url?: string;
  tabs?: string[];
  className?: string;
  children: React.ReactNode;
}

export function BrowserShell({
  url = "ticketiv.app",
  tabs = ["Ticketiv"],
  className,
  children,
}: BrowserShellProps) {
  return (
    <div
      className={cn(
        "flex h-[900px] w-[1440px] flex-col overflow-hidden rounded-[14px] bg-bg",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_30px_60px_-10px_rgba(10,9,8,0.18)]",
        className
      )}
    >
      {/* Chrome */}
      <div className="flex items-center gap-3 border-b border-line-2 bg-[#ececea] px-3.5 py-2.5">
        <div className="flex gap-2">
          <span className="h-3 w-3 rounded-full bg-[#fc5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#fcbb2b]" />
          <span className="h-3 w-3 rounded-full bg-[#28c83f]" />
        </div>
        <div className="ml-2 flex flex-1 gap-1 [&>div]:max-w-[220px] [&>div]:truncate">
          {tabs.map((t, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center gap-1.5 rounded-t-md border border-line-2 border-b-0 px-3.5 py-1.5 text-[12px]",
                i === 0
                  ? "bg-bg text-ink-2"
                  : "border-transparent bg-transparent text-ink-3"
              )}
            >
              <span
                className={cn(
                  "h-3 w-3 rounded-[3px]",
                  i === 0 ? "bg-accent" : "bg-line-2"
                )}
              />
              {t}
            </div>
          ))}
        </div>
        <div className="flex max-w-[420px] flex-1 items-center gap-2 rounded-md bg-bg px-3.5 py-1 font-mono text-[12px] text-ink-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18 M12 3a13 13 0 010 18 M12 3a13 13 0 000 18" />
          </svg>
          <span>https://{url}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-bg">{children}</div>
    </div>
  );
}
