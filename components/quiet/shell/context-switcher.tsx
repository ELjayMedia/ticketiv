"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import type { ContextKind, UserContext } from "@/lib/data/identity/contexts"
import { switchContextAction } from "@/lib/identity/context-actions"

const KIND_ICON: Record<ContextKind, IconName> = {
  personal: "user",
  org: "users",
  talent: "music",
  scan: "qr",
  admin: "settings",
}

// Per-context accent so the user always knows which hat they're wearing.
const KIND_COLOR: Record<ContextKind, string> = {
  personal: "#6366f1",
  org: "#0ea5e9",
  talent: "#ec4899",
  scan: "#f59e0b",
  admin: "#ef4444",
}

export function ContextSwitcher({
  contexts,
  activeKey,
}: {
  contexts: UserContext[]
  activeKey: string | null
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  const current = contexts.find((c) => c.key === activeKey) ?? contexts[0]

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  if (!current) return null

  function select(c: UserContext) {
    setOpen(false)
    if (c.key === current.key) return
    startTransition(() => {
      void switchContextAction(c.key, c.href)
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-[var(--radius)] border border-line-2 bg-surface px-2.5 py-1.5 text-[13px] transition-colors hover:bg-bg disabled:opacity-60"
      >
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: KIND_COLOR[current.kind] }}
        >
          <Icon name={KIND_ICON[current.kind]} size={12} />
        </span>
        <span className="max-w-[140px] truncate font-medium text-ink">{current.label}</span>
        <Icon name="chevD" size={14} className="text-ink-3" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-50 mt-1.5 w-60 overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface shadow-[var(--shadow-card)]"
        >
          {contexts.map((c) => (
            <button
              key={c.key}
              type="button"
              role="menuitem"
              onClick={() => select(c)}
              className={
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-bg " +
                (c.key === current.key ? "bg-bg" : "")
              }
            >
              <span
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: KIND_COLOR[c.kind] }}
              >
                <Icon name={KIND_ICON[c.kind]} size={14} />
              </span>
              <span className="flex flex-1 flex-col">
                <span className="text-[13px] font-medium text-ink">{c.label}</span>
                {c.sublabel && <span className="font-mono text-[10px] text-ink-3">{c.sublabel}</span>}
              </span>
              {c.key === current.key && <Icon name="check" size={14} className="text-accent" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
