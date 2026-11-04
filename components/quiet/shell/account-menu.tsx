"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/quiet/ui/icon";
import { Avatar } from "@/components/quiet/ui/primitives";
import { ACCOUNT_NAV } from "@/components/quiet/shell/account-nav";

/** Desktop avatar menu: the account pages, then sign out. */
export function AccountMenu({ avatarUrl, displayName }: { avatarUrl?: string; displayName?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-bg"
      >
        <Avatar src={avatarUrl} size={30} />
        <Icon name="chevD" size={14} className="text-ink-3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface py-1.5 shadow-[var(--shadow-card)]"
        >
          {displayName && (
            <div className="border-b border-line px-3.5 pb-2.5 pt-1.5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Signed in as</p>
              <p className="truncate text-[14px] font-semibold text-ink">{displayName}</p>
            </div>
          )}
          {ACCOUNT_NAV.map((group) => (
            <div key={group.label} className="border-b border-line py-1 last:border-b-0">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink-2 transition-colors hover:bg-bg hover:text-ink"
                >
                  <Icon name={item.icon} size={15} className="text-ink-3" />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
          <form action="/api/sign-out" method="post" className="pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] text-danger transition-colors hover:bg-danger-soft"
            >
              <Icon name="logout" size={15} />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
